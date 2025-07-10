import type { NumberOfMilliseconds, UnixTimestampMillis } from '../types.js'

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
  const started = Date.now() as UnixTimestampMillis
  return {
    [Symbol.dispose](): void {
      console.log(`${name ? name + ' ' : ''}took ${_since(started)}`)
    },
  } as any
}

/**
 * Returns time passed since `from` until `until` (default to Date.now())
 */
export function _since(
  from: UnixTimestampMillis,
  until: UnixTimestampMillis = Date.now() as UnixTimestampMillis,
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

  // < 5 sec
  if (millis < 5000) {
    const s = millis / 1000
    return `${Math.trunc(s) === s ? s : s.toFixed(3)} sec`
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
