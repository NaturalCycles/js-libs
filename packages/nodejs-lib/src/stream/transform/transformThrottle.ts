import { Transform } from 'node:stream'
import { _ms, _since, localTime } from '@naturalcycles/js-lib/datetime'
import type { DeferredPromise } from '@naturalcycles/js-lib/promise'
import { pDefer } from '@naturalcycles/js-lib/promise/pDefer.js'
import type {
  NumberOfSeconds,
  PositiveInteger,
  UnixTimestampMillis,
} from '@naturalcycles/js-lib/types'
import type { TransformTyped } from '../stream.model.js'

export interface TransformThrottleOptions {
  /**
   * How many items to allow per `interval` of seconds.
   */
  throughput: PositiveInteger

  /**
   * How long is the interval (in seconds) where number of items should not exceed `throughput`.
   */
  interval: NumberOfSeconds

  debug?: boolean
}

/**
 * Allows to throttle the throughput of the stream.
 * For example, when you have an API with rate limit of 5000 requests per minute,
 * `transformThrottle` can help you utilize it most efficiently.
 * You can define it as:
 *
 * _pipeline([
 *   // ...
 *   transformThrottle({
 *     throughput: 5000,
 *     interval: 60,
 *   }),
 *   // ...
 * ])
 *
 * @experimental
 */
export function transformThrottle<T>(opt: TransformThrottleOptions): TransformTyped<T, T> {
  const { throughput, interval, debug } = opt

  let count = 0
  let start: UnixTimestampMillis
  let paused: DeferredPromise | undefined
  let timeout: NodeJS.Timeout | undefined

  return new Transform({
    objectMode: true,
    async transform(item: T, _, cb) {
      // console.log('incoming', item, { paused: !!paused, count })
      if (!start) {
        start = Date.now() as UnixTimestampMillis
        timeout = setTimeout(() => onInterval(this), interval * 1000)
        if (debug) {
          console.log(`${localTime.now().toPretty()} transformThrottle started with`, {
            throughput,
            interval,
            rps: Math.round(throughput / interval),
          })
        }
      }

      if (paused) {
        // console.log('awaiting pause', {item, count})
        await paused
      }

      if (++count >= throughput) {
        // console.log('pausing now after', {item, count})
        paused = pDefer()
        if (debug) {
          console.log(
            `${localTime.now().toPretty()} transformThrottle activated: ${count} items passed in ${_since(start)}, will pause for ${_ms(interval * 1000 - (Date.now() - start))}`,
          )
        }
      }

      cb(null, item) // pass the item through
    },
    final(cb) {
      clearTimeout(timeout)
      cb()
    },
  })

  function onInterval(transform: Transform): void {
    if (paused) {
      if (debug) {
        console.log(`${localTime.now().toPretty()} transformThrottle resumed`)
      }

      paused.resolve()
      paused = undefined
    } else {
      if (debug) {
        console.log(
          `${localTime.now().toPretty()} transformThrottle passed ${count} (of max ${throughput}) items in ${_since(start)}`,
        )
      }
    }

    count = 0
    start = Date.now() as UnixTimestampMillis
    timeout = setTimeout(() => onInterval(transform), interval * 1000)
  }
}
