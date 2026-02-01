import { Transform } from 'node:stream'
import { createCommonLoggerAtLevel } from '@naturalcycles/js-lib/log'
import { pDefer } from '@naturalcycles/js-lib/promise/pDefer.js'
import type { DeferredPromise } from '@naturalcycles/js-lib/promise/pDefer.js'
// oxlint-disable-next-line import/no-cycle -- intentional cycle
import { Pipeline } from '../pipeline.js'
import { createReadable } from '../readable/createReadable.js'
import type { TransformOptions, TransformTyped } from '../stream.model.js'

/**
 * Allows to "fork" away from the "main pipeline" into the "forked pipeline".
 *
 * Correctly keeps backpressure from both "downstreams" (main and forked).
 *
 * @experimental
 */
export function transformFork<T>(
  fn: (pipeline: Pipeline<T>) => Promise<void>,
  opt: TransformOptions = {},
): TransformTyped<T, T> {
  const { objectMode = true, highWaterMark } = opt
  const logger = createCommonLoggerAtLevel(opt.logger, opt.logLevel)

  let lock: DeferredPromise | undefined

  const fork = createReadable<T>([], {}, () => {
    // `_read` is called
    if (!lock) return
    // We had a lock - let's Resume
    logger.debug(`TransformFork: resume`)
    const lockCopy = lock
    lock = undefined
    lockCopy.resolve()
  })

  void fn(Pipeline.from<T>(fork)).then(() => {
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
        logger.debug(`TransformFork: pause`)
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
