import type { NumberOfMilliseconds, UnixTimestamp, UnixTimestampMillis } from '../types.js'

/**
 * using _ = blockTimer()
 * // will log "took 1.234 sec" on dispose
 *
 * using _ = blockTimer('named')
 * // will log "named took 1.234 sec" on dispose
 *
 * @experimental
 */
export function _blockTimer(name?: string): Disposable {
  const started = nowUnixMillis()
  return {
    [Symbol.dispose](): void {
      console.log(`${name ? name + ' ' : ''}took ${_since(started)}`)
    },
  }
}

/**
 * Returns time passed since `from` until `until` (default to Date.now())
 */
export function _since(
  from: UnixTimestampMillis,
  until: UnixTimestampMillis = nowUnixMillis(),
): string {
  return _ms(until - from)
}

/**
 * Returns, e.g:
 * 125 ms
 * 1.125 sec
 * 11 sec
 * 1m12s
 * 59m2s
 * 1h3m12s
 */
export function _ms(millis: NumberOfMilliseconds): string {
  // <1 sec
  if (millis < 1000) return `${Math.round(millis)} ms`

  // < 10 sec
  if (millis < 10_000) {
    const s = millis / 1000
    return `${s.toFixed(2)} sec`
  }

  const sec = Math.floor(millis / 1000) % 60
  const min = Math.floor(millis / (60 * 1000)) % 60
  const hrs = Math.floor(millis / (3600 * 1000))

  // <1 hr
  if (hrs === 0) {
    // <1 min
    if (min === 0) return `${sec} sec`

    return `${min}m${sec}s`
  }

  if (hrs < 24) {
    return `${hrs}h${min}m`
  }

  if (hrs < 48) {
    return `${Math.round(hrs + min / 60)}h`
  }

  // >= 48 hours

  const days = Math.floor(hrs / 24)
  return `${days} days`
}

/**
 * Can be used instead of `oxlint-disable ...` in places where Date is intentionally needed
 */
export function newDate(): Date {
  // oxlint-disable-next-line no-restricted-globals -- the one sanctioned way to get a native Date
  return new Date()
}

/**
 Convenience function to return current Unix timestamp in seconds.
 Like Date.now(), but in seconds.

 Lives here rather than in localTime.ts, so importing it doesn't pull LocalTime into browser bundles.
 */
export function nowUnix(): UnixTimestamp {
  // oxlint-disable-next-line no-restricted-globals -- the one sanctioned way to read the clock
  return Math.floor(Date.now() / 1000) as UnixTimestamp
}

/**
 Convenience function that retuns the same as Date.now(), but with proper type of UnixTimestampMillis.

 Lives here rather than in localTime.ts, so importing it doesn't pull LocalTime into browser bundles.
 */
export function nowUnixMillis(): UnixTimestampMillis {
  // oxlint-disable-next-line no-restricted-globals -- the one sanctioned way to read the clock
  return Date.now() as UnixTimestampMillis
}
