import { Transform } from 'node:stream'
import { createCommonLoggerAtLevel } from '@naturalcycles/js-lib/log'
import type { DeferredPromise } from '@naturalcycles/js-lib/promise'
import { pDefer } from '@naturalcycles/js-lib/promise/pDefer.js'
import type { NumberOfSeconds, PositiveInteger } from '@naturalcycles/js-lib/types'
import type { TransformOptions, TransformTyped } from '../stream.model.js'

export interface TransformWarmupOptions extends TransformOptions {
  /**
   * Target concurrency after warmup completes.
   */
  concurrency: PositiveInteger

  /**
   * Time in seconds to gradually increase concurrency from 1 to `concurrency`.
   * Set to 0 to disable warmup (pass-through mode from the start).
   */
  warmupSeconds: NumberOfSeconds
}

/**
 * Transform that gradually increases concurrency from 1 to the configured maximum
 * over a warmup period. Useful for scenarios where you want to avoid overwhelming
 * a system at startup (e.g., database connections, API rate limits).
 *
 * During warmup: limits concurrent items based on elapsed time.
 * After warmup: passes items through immediately with zero overhead.
 *
 * @experimental
 */
export function transformWarmup<T>(opt: TransformWarmupOptions): TransformTyped<T, T> {
  const { concurrency, warmupSeconds, objectMode = true, highWaterMark } = opt
  const warmupMs = warmupSeconds * 1000
  const logger = createCommonLoggerAtLevel(opt.logger, opt.logLevel)

  let startTime = 0
  let warmupComplete = warmupSeconds <= 0 || concurrency <= 1
  let inFlight = 0
  const waiters: DeferredPromise[] = []

  return new Transform({
    objectMode,
    highWaterMark,
    async transform(item: T, _, cb) {
      // Initialize start time on first item
      if (startTime === 0) {
        startTime = Date.now()
      }

      // Fast-path: after warmup, just pass through with zero overhead
      if (warmupComplete) {
        cb(null, item)
        return
      }

      const currentConcurrency = getCurrentConcurrency()

      if (inFlight < currentConcurrency) {
        // Have room, proceed immediately
        inFlight++
        logger.debug(`inFlight++ ${inFlight}/${currentConcurrency}, waiters ${waiters.length}`)
      } else {
        // Wait for a slot
        const waiter = pDefer()
        waiters.push(waiter)
        logger.debug(`inFlight ${inFlight}/${currentConcurrency}, waiters++ ${waiters.length}`)
        await waiter
        logger.debug(`waiter resolved, inFlight ${inFlight}/${getCurrentConcurrency()}`)
      }

      // Push the item
      cb(null, item)

      // Release slot on next microtask - essential for concurrency control.
      // Without this, the slot would be freed immediately and items would
      // flow through without any limiting effect.
      queueMicrotask(release)
    },
  })

  function getCurrentConcurrency(): number {
    if (warmupComplete) return concurrency

    const elapsed = Date.now() - startTime
    if (elapsed >= warmupMs) {
      warmupComplete = true
      logger.debug('warmup complete')
      return concurrency
    }

    // Linear interpolation from 1 to concurrency
    const progress = elapsed / warmupMs
    return Math.max(1, Math.floor(1 + (concurrency - 1) * progress))
  }

  function release(): void {
    inFlight--
    // Wake up waiters based on current concurrency (may have increased)
    const currentConcurrency = getCurrentConcurrency()
    while (waiters.length && inFlight < currentConcurrency) {
      inFlight++
      waiters.shift()!.resolve()
    }
  }
}
