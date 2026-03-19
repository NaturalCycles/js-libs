import { Transform } from 'node:stream'
import { _mb } from '@naturalcycles/js-lib'
import { _ms, localTime } from '@naturalcycles/js-lib/datetime'
import { createCommonLoggerAtLevel } from '@naturalcycles/js-lib/log'
import type { DeferredPromise } from '@naturalcycles/js-lib/promise'
import { pDefer } from '@naturalcycles/js-lib/promise/pDefer.js'
import type { Integer, NumberOfMilliseconds } from '@naturalcycles/js-lib/types'
import type { TransformOptions, TransformTyped } from '../stream.model.js'

export interface TransformThrottleByRSSOptions extends TransformOptions {
  /**
   * Maximum RSS (Resident Set Size) in megabytes.
   * When process RSS exceeds this value, the stream will pause
   * until RSS drops below the threshold.
   */
  maxRSS: Integer

  /**
   * How often to re-check RSS (in milliseconds) while paused.
   *
   * @default 5000
   */
  pollInterval?: NumberOfMilliseconds

  /**
   * If this timeout is reached while RSS is above the limit -
   * the transform will "give up", log the bold warning, and "open the gateways".
   * Things will likely OOM after that, but at least it will not "hang forever".
   *
   * @default 30 minutes
   */
  pollTimeout?: NumberOfMilliseconds

  /**
   * What to do if pollTimeout is reached.
   * 'open-the-floodgates' will disable this throttle completely (YOLO).
   * 'throw' will throw an error, which will destroy the stream/Pipeline.
   *
   * @default 'open-the-floodgates'
   */
  onPollTimeout?: 'open-the-floodgates' | 'throw'
}

/**
 * Throttles the stream based on process memory (RSS) usage.
 * When RSS exceeds `maxRSS` (in megabytes), the stream pauses
 * and periodically re-checks until RSS drops below the threshold.
 *
 * Useful for pipelines that process large amounts of data and
 * may cause memory pressure (e.g. database imports, file processing).
 *
 * @experimental
 */
export function transformThrottleByRSS<T>(
  opt: TransformThrottleByRSSOptions,
): TransformTyped<T, T> {
  const {
    maxRSS,
    pollInterval = 5000,
    pollTimeout = 30 * 60_000, // 30 min
    onPollTimeout = 'open-the-floodgates',
    objectMode = true,
    highWaterMark,
  } = opt

  const maxRSSBytes = maxRSS * 1024 * 1024
  let lock: DeferredPromise | undefined
  let pollTimer: NodeJS.Timeout | undefined
  let rssCheckTimer: NodeJS.Timeout | undefined
  let lastRSS = 0
  let pausedSince = 0
  let disabled = false
  const logger = createCommonLoggerAtLevel(opt.logger, opt.logLevel)

  return new Transform({
    objectMode,
    highWaterMark,
    async transform(item: T, _, cb) {
      if (lock) {
        try {
          await lock
        } catch (err) {
          cb(err as Error)
          return
        }
      }

      if (!disabled && lastRSS > maxRSSBytes && !lock) {
        lock = pDefer()
        pausedSince = Date.now()
        logger.log(
          `${localTime.now().toPretty()} transformThrottleByRSS paused: RSS ${_mb(lastRSS)} > ${maxRSS} MB`,
        )
        pollTimer = setTimeout(() => pollRSS(), pollInterval)
      }

      cb(null, item)
    },
    construct(cb) {
      // Start periodic RSS checking
      checkRSS()
      cb()
    },
    final(cb) {
      clearTimeout(pollTimer)
      clearTimeout(rssCheckTimer)
      cb()
    },
  })

  function checkRSS(): void {
    lastRSS = process.memoryUsage.rss()
    rssCheckTimer = setTimeout(() => checkRSS(), pollInterval)
  }

  function pollRSS(): void {
    const rss = lastRSS

    if (rss <= maxRSSBytes) {
      logger.log(
        `${localTime.now().toPretty()} transformThrottleByRSS resumed: RSS ${_mb(rss)} <= ${maxRSS} MB`,
      )
      lock!.resolve()
      lock = undefined
    } else if (pollTimeout && Date.now() - pausedSince >= pollTimeout) {
      clearTimeout(rssCheckTimer)
      if (onPollTimeout === 'throw') {
        lock!.reject(
          new Error(
            `transformThrottleByRSS pollTimeout of ${_ms(pollTimeout)} reached, RSS ${_mb(rss)} still > ${maxRSS} MB`,
          ),
        )
        lock = undefined
      } else {
        // open-the-floodgates
        logger.error(
          `${localTime.now().toPretty()} transformThrottleByRSS: pollTimeout of ${_ms(pollTimeout)} reached, RSS ${_mb(rss)} still > ${maxRSS} MB — DISABLING THROTTLE`,
        )
        disabled = true
        lock!.resolve()
        lock = undefined
      }
    } else {
      logger.log(
        `${localTime.now().toPretty()} transformThrottleByRSS still paused: RSS ${_mb(rss)} > ${maxRSS} MB, rechecking in ${_ms(pollInterval)}`,
      )
      pollTimer = setTimeout(() => pollRSS(), pollInterval)
    }
  }
}
