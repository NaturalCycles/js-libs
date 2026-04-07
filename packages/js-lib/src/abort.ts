import { _isTruthy } from './is.util.js'
import type { NumberOfMilliseconds } from './types.js'

/**
 * Like AbortSignal, but it can "abort itself" via the `.abort()` method.
 *
 * Similar to how DeferredPromise is both a Promise and has `.resolve()` and `.reject()` methods.
 *
 * This is to simplify the AbortController/AbortSignal usage.
 *
 * Before this - you need to keep track of 2 things: AbortController and AbortSignal.
 *
 * After - you are good with only AbortableSignal, which can do both.
 * And it's compatible with AbortSignal (because it extends it).
 *
 * @experimental
 */
export interface AbortableSignal extends AbortSignal {
  abort: AbortController['abort']
}

/**
 * Creates AbortableSignal,
 * which is like AbortSignal, but can "abort itself" with `.abort()` method.
 *
 * @experimental
 */
export function createAbortableSignal(): AbortableSignal {
  const ac = new AbortController()
  return Object.assign(ac.signal, {
    abort: ac.abort.bind(ac),
  })
}

/**
 * Returns AbortSignal if ms is defined.
 * Otherwise returns undefined.
 */
export function abortSignalTimeoutOrUndefined(
  ms: NumberOfMilliseconds | undefined,
): AbortSignal | undefined {
  return ms ? abortSignalTimeout(ms) : undefined
}

/**
 * Returns an AbortSignal that aborts after the given number of milliseconds.
 * Uses native `AbortSignal.timeout()` when available, falls back to a polyfill.
 *
 * The abort reason is a DOMException with name "TimeoutError".
 */
export function abortSignalTimeout(ms: NumberOfMilliseconds): AbortSignal {
  return typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(ms)
    : polyfilledAbortSignalTimeout(ms)
}

export function polyfilledAbortSignalTimeout(ms: NumberOfMilliseconds): AbortSignal {
  const ac = new AbortController()
  setTimeout(() => {
    ac.abort(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))
  }, ms)
  return ac.signal
}

/**
 * Returns AbortSignal.any(signals) is the array (after filtering undefined inputs) is not empty,
 * otherwise undefined.
 */
export function abortSignalAnyOrUndefined(
  signals: (AbortSignal | undefined)[],
): AbortSignal | undefined {
  const filtered = signals.filter(_isTruthy)
  return filtered.length ? abortSignalAny(filtered) : undefined
}

/**
 * Returns an AbortSignal that aborts when any of the given signals abort.
 * Uses native `AbortSignal.any()` when available, falls back to a polyfill.
 *
 * The abort reason is taken from the first signal that aborts.
 * If any input signal is already aborted, the returned signal is immediately aborted.
 *
 * If only 1 signal is passed in the input array - that Signal is returned as-is.
 */
export function abortSignalAny(signals: AbortSignal[]): AbortSignal {
  if (signals.length === 1) {
    return signals[0]!
  }

  return typeof AbortSignal.any === 'function'
    ? AbortSignal.any(signals)
    : polyfilledAbortSignalAny(signals)
}

export function polyfilledAbortSignalAny(signals: AbortSignal[]): AbortSignal {
  const ac = new AbortController()

  for (const signal of signals) {
    if (signal.aborted) {
      ac.abort(signal.reason)
      return ac.signal
    }
  }

  for (const signal of signals) {
    signal.addEventListener('abort', () => ac.abort(signal.reason), {
      once: true,
      signal: ac.signal,
    })
  }

  return ac.signal
}
