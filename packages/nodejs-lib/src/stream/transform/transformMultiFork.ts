import { Transform } from 'node:stream'
import { createCommonLoggerAtLevel } from '@naturalcycles/js-lib/log'
import { type DeferredPromise, pDefer } from '@naturalcycles/js-lib/promise/pDefer.js'
import type { NonNegativeInteger, Predicate } from '@naturalcycles/js-lib/types'
import { Pipeline } from '../pipeline.js'
import { createReadable } from '../readable/createReadable.js'
import type { ReadableTyped, TransformOptions, TransformTyped } from '../stream.model.js'

/**
 * Like transformFork, but allows to fork multiple times,
 * aka "split the stream" into chunks, and attach a Pipeline to
 * each of the chunks.
 *
 * Example use case: you want to write to Cloud Storage, 1000 rows per file,
 * each file needs its own destination Pipeline.
 *
 * @experimental
 */
export function transformMultiFork<T>(
  splitPredicate: Predicate<T>,
  fn: (pipeline: Pipeline<T>, splitIndex: NonNegativeInteger) => Promise<void>,
  opt: TransformOptions = {},
): TransformTyped<T, T> {
  const { objectMode = true, highWaterMark } = opt
  const logger = createCommonLoggerAtLevel(opt.logger, opt.logLevel)
  let indexWritten = 0
  let splitIndex = 0

  let lock: DeferredPromise | undefined
  let fork = createNewFork()

  return new Transform({
    objectMode,
    highWaterMark,
    async transform(chunk: T, _, cb) {
      // pass through to the "main" pipeline
      // Main pipeline should handle backpressure "automatically",
      // so, we're not maintaining a Lock for it
      this.push(chunk)

      if (lock) {
        // Forked pipeline is locked - let's wait for it to call _read
        await lock
        // lock is undefined at this point
      }

      // pass to the "forked" pipeline
      const shouldContinue = fork.push(chunk)
      if (!shouldContinue && !lock) {
        // Forked pipeline indicates that we should Pause
        lock = pDefer()
        logger.debug(`TransformMultiFork(${splitIndex}): pause`)
      }

      if (splitPredicate(chunk, ++indexWritten)) {
        logger.log(`TransformMultiFork(${splitIndex}): splitting to ${splitIndex + 1}`)
        splitIndex++
        fork.push(null)
        lock?.resolve()
        lock = undefined
        fork = createNewFork()
      }

      // acknowledge that we've finished processing the input chunk
      cb()
    },
    async final(cb) {
      logger.log(`TransformMultiFork: final`)

      // Pushing null "closes"/ends the secondary pipeline correctly
      fork.push(null)

      // Acknowledge that we've received `null` and passed it through to the fork
      cb()
    },
  })

  function createNewFork(): ReadableTyped<T> {
    const currentSplitIndex = splitIndex

    const readable = createReadable<T>([], {}, () => {
      // `_read` is called
      if (!lock) return
      // We had a lock - let's Resume
      logger.debug(`TransformMultiFork(${currentSplitIndex}): resume`)
      const lockCopy = lock
      lock = undefined
      lockCopy.resolve()
    })

    void fn(Pipeline.from<T>(readable), currentSplitIndex).then(() => {
      logger.log(`TransformMultiFork(${currentSplitIndex}): done`)
    })

    return readable
  }
}
