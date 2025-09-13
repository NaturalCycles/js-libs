import { Transform } from 'node:stream'
import { createCommonLoggerAtLevel } from '@naturalcycles/js-lib/log'
import { type DeferredPromise, pDefer } from '@naturalcycles/js-lib/promise/pDefer.js'
import { Pipeline } from '../pipeline.js'
import { readableCreate } from '../readable/readableCreate.js'
import type { TransformOptions, TransformTyped } from '../stream.model.js'

/**
 * Allows to "fork" away from the "main pipeline" into the "forked pipeline".
 *
 * Correctly keeps backpressure from both "downstreams" (main and forked).
 *
 * @experimental
 */
export function transformFork<T, FORK>(
  fn: (pipeline: Pipeline<T>) => Pipeline<FORK>,
  opt: TransformOptions = {},
): TransformTyped<T, T> {
  const { objectMode = true, highWaterMark } = opt
  const logger = createCommonLoggerAtLevel(opt.logger, opt.logLevel)

  let lock: DeferredPromise | undefined

  const fork = readableCreate<T>([], {}, () => {
    // `_read` is called
    if (!lock) return
    // We had a lock - let's Resume
    logger.log(`TransformFork: resume`)
    const lockCopy = lock
    lock = undefined
    lockCopy.resolve()
  })

  const p = fn(Pipeline.from<T>(fork))
  void p.run().then(() => {
    logger.log('TransformFork: done')
  })

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
        logger.log(`TransformFork: pause`)
      }

      // acknowledge that we've finished processing the input chunk
      cb()
    },
    async final(cb) {
      logger.log('TransformFork: final')

      // Pushing null "closes"/ends the secondary pipeline correctly
      fork.push(null)

      // Acknowledge that we've received `null` and passed it through to the fork
      cb()
    },
  })
}
