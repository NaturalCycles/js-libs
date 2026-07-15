import { _anyToError } from '../error/error.util.js'
import { pDefer } from '../promise/pDefer.js'
import type { DeferredPromise } from '../promise/pDefer.js'
import type { AnyAsyncFunction, AnyFunction } from '../types.js'

export function _debounce<T extends AnyFunction>(
  func: T,
  wait: number,
  opt: DebounceOptions = {},
): T & Cancelable {
  let lastArgs: Parameters<T> | undefined
  let lastThis: ThisParameterType<T> | undefined
  let result: ReturnType<T>
  let timerId: number | undefined

  const maxing = 'maxWait' in opt
  const { leading = false, trailing = true } = opt
  const state: DebounceTimerState = {
    lastCallTime: undefined,
    lastInvokeTime: 0,
    wait,
    maxing,
    maxWait: maxing ? Math.max(Number(opt.maxWait) || 0, wait) : opt.maxWait,
  }

  function invokeFunc(time: number): ReturnType<T> {
    const args = lastArgs
    const thisArg = lastThis

    lastArgs = lastThis = undefined
    state.lastInvokeTime = time
    result = func.apply(thisArg, args!)
    return result
  }

  function leadingEdge(time: number): ReturnType<T> {
    // Reset any `maxWait` timer.
    state.lastInvokeTime = time
    // Start the timer for the trailing edge.
    timerId = startTimer(timerExpired, state.wait)
    // Invoke the leading edge.
    return leading ? invokeFunc(time) : result
  }

  function timerExpired(): void {
    const time = Date.now()
    if (shouldInvoke(time, state)) {
      trailingEdge(time)
      return
    }
    // Restart the timer.
    timerId = startTimer(timerExpired, remainingWait(time, state))
  }

  function trailingEdge(time: number): ReturnType<T> {
    timerId = undefined

    // Only invoke if we have `lastArgs` which means `func` has been
    // debounced at least once.
    if (trailing && lastArgs) {
      return invokeFunc(time)
    }
    lastArgs = lastThis = undefined
    return result
  }

  function cancel(): void {
    if (timerId !== undefined) {
      cancelTimer(timerId)
    }
    state.lastInvokeTime = 0
    state.lastCallTime = undefined
    lastArgs = lastThis = timerId = undefined
  }

  function flush(): ReturnType<T> {
    return timerId === undefined ? result : trailingEdge(Date.now())
  }

  function pending(): boolean {
    return timerId !== undefined
  }

  function debounced(this: ThisParameterType<T>, ...args: Parameters<T>): ReturnType<T> {
    const time = Date.now()
    const isInvoking = shouldInvoke(time, state)

    lastArgs = args
    lastThis = this
    state.lastCallTime = time

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(state.lastCallTime)
      }
      if (state.maxing) {
        // Handle invocations in a tight loop.
        timerId = startTimer(timerExpired, state.wait)
        return invokeFunc(state.lastCallTime)
      }
    }
    if (timerId === undefined) {
      timerId = startTimer(timerExpired, state.wait)
    }
    return result
  }

  debounced.cancel = cancel
  debounced.flush = flush
  debounced.pending = pending
  return debounced as any
}

export function _throttle<T extends AnyFunction>(
  func: T,
  wait: number,
  opt: ThrottleOptions = {},
): T & Cancelable {
  return _debounce(func, wait, {
    leading: true,
    trailing: true,
    ...opt,
    maxWait: wait,
  })
}

/**
 * Like `_debounce`, but for async functions.
 *
 * Unlike `_debounce` (which returns a stale `result`/`undefined` for suppressed calls),
 * `_asyncDebounce` always returns a real Promise, resolving with the coalesced invocation's result.
 *
 * @experimental
 */
export function _asyncDebounce<T extends AnyAsyncFunction>(
  func: T,
  wait: number,
  opt: AsyncDebounceOptions = {},
): AsyncDebounced<T> {
  let lastArgs: Parameters<T> | undefined
  let lastThis: ThisParameterType<T> | undefined
  let timerId: number | undefined
  // Promise shared by all calls coalesced into the next invocation (undefined when none pending).
  let deferred: DeferredPromise<Awaited<ReturnType<T>> | undefined> | undefined

  const { leading = false, trailing = true } = opt

  const maxing = 'maxWait' in opt
  const maxWait = maxing ? Math.max(Number(opt.maxWait) || 0, wait) : opt.maxWait

  const state: DebounceTimerState = {
    lastCallTime: undefined,
    lastInvokeTime: 0,
    wait,
    maxing,
    maxWait,
  }

  async function invokeFunc(time: number): Promise<void> {
    const args = lastArgs
    const thisArg = lastThis

    lastArgs = lastThis = undefined
    state.lastInvokeTime = time

    // Detach and settle the current batch.
    const d = deferred!
    deferred = undefined
    try {
      const result = await func.apply(thisArg, args!)
      d.resolve(result)
    } catch (err) {
      d.reject(_anyToError(err))
    }
  }

  async function leadingEdge(time: number): Promise<Awaited<ReturnType<T>> | undefined> {
    // Reset any `maxWait` timer.
    state.lastInvokeTime = time
    // Start the timer for the trailing edge.
    timerId = startTimer(timerExpired, state.wait)
    // Capture the batch before `invokeFunc` detaches it.
    const d = deferred!
    // Invoke the leading edge.
    if (leading) {
      await invokeFunc(time)
    }
    return d
  }

  function timerExpired(): void {
    const time = Date.now()
    if (shouldInvoke(time, state)) {
      void trailingEdge(time)
      return
    }
    // Restart the timer.
    timerId = startTimer(timerExpired, remainingWait(time, state))
  }

  async function trailingEdge(time: number): Promise<void> {
    timerId = undefined

    // Only invoke if we have `lastArgs` which means `func` has been
    // debounced at least once.
    if (trailing && lastArgs && deferred) {
      await invokeFunc(time)
      return
    }
    lastArgs = lastThis = undefined
    // Dropped batch (only reachable with `trailing: false`): no invocation, so resolve `undefined`.
    if (deferred) {
      const d = deferred
      deferred = undefined
      d.resolve(undefined)
    }
  }

  function cancel(): void {
    if (timerId !== undefined) {
      cancelTimer(timerId)
    }
    state.lastInvokeTime = 0
    state.lastCallTime = undefined
    lastArgs = lastThis = timerId = undefined
    // Reject pending awaiters.
    if (deferred) {
      const d = deferred
      deferred = undefined
      d.reject(new Error('asyncDebounce cancelled'))
    }
  }

  async function flush(): Promise<Awaited<ReturnType<T>> | undefined> {
    if (timerId === undefined || !deferred) {
      return undefined
    }
    const d = deferred
    cancelTimer(timerId)
    await trailingEdge(Date.now())
    return d
  }

  function pending(): boolean {
    return timerId !== undefined
  }

  async function debounced(
    this: ThisParameterType<T>,
    ...args: Parameters<T>
  ): Promise<Awaited<ReturnType<T>> | undefined> {
    const time = Date.now()
    const isInvoking = shouldInvoke(time, state)

    lastArgs = args
    lastThis = this
    state.lastCallTime = time

    deferred ||= pDefer<Awaited<ReturnType<T>> | undefined>()
    const currentDeferred = deferred

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(state.lastCallTime)
      }
      if (state.maxing) {
        // Handle invocations in a tight loop.
        timerId = startTimer(timerExpired, state.wait)
        await invokeFunc(state.lastCallTime)
        return currentDeferred
      }
    }
    if (timerId === undefined) {
      timerId = startTimer(timerExpired, state.wait)
    }
    return currentDeferred
  }

  debounced.cancel = cancel
  debounced.flush = flush
  debounced.pending = pending
  return debounced as any
}

/**
 * Like `_throttle`, but for async functions. See `_asyncDebounce` for the Promise semantics.
 *
 * @experimental
 */
export function _asyncThrottle<T extends AnyAsyncFunction>(
  func: T,
  wait: number,
  opt: AsyncThrottleOptions = {},
): AsyncDebounced<T> {
  return _asyncDebounce(func, wait, {
    leading: true,
    trailing: true,
    ...opt,
    maxWait: wait,
  })
}

function remainingWait(time: number, state: DebounceTimerState): number {
  const { lastCallTime, lastInvokeTime, wait, maxing, maxWait } = state
  const timeSinceLastCall = time - lastCallTime!
  const timeSinceLastInvoke = time - lastInvokeTime
  const timeWaiting = wait - timeSinceLastCall

  return maxing ? Math.min(timeWaiting, maxWait! - timeSinceLastInvoke) : timeWaiting
}

function shouldInvoke(time: number, state: DebounceTimerState): boolean {
  const { lastCallTime, lastInvokeTime, wait, maxing, maxWait } = state
  const timeSinceLastCall = time - lastCallTime!
  const timeSinceLastInvoke = time - lastInvokeTime

  // Either this is the first call, activity has stopped and we're at the
  // trailing edge, the system time has gone backwards and we're treating
  // it as the trailing edge, or we've hit the `maxWait` limit.
  return (
    lastCallTime === undefined ||
    timeSinceLastCall >= wait ||
    timeSinceLastCall < 0 ||
    (maxing && timeSinceLastInvoke >= maxWait!)
  )
}

function startTimer(pendingFunc: AnyFunction, wait: number): number {
  return setTimeout(pendingFunc, wait)
}

function cancelTimer(id: number): void {
  clearTimeout(id)
}

interface DebounceTimerState {
  lastCallTime: number | undefined
  lastInvokeTime: number
  wait: number
  maxing: boolean
  maxWait: number | undefined
}

export interface Cancelable {
  cancel: () => void
  flush: () => void
}

export interface ThrottleOptions {
  /**
   * Invoke on the leading edge of the window (immediately, on the first call).
   *
   * @default true
   */
  leading?: boolean

  /**
   * Invoke on the trailing edge of the window (after `wait` has elapsed).
   *
   * @default true
   */
  trailing?: boolean
}

export interface DebounceOptions {
  /**
   * Invoke on the leading edge of the window (immediately, on the first call).
   *
   * @default false
   */
  leading?: boolean

  /**
   * Invoke on the trailing edge of the window (after `wait` has elapsed).
   *
   * @default true
   */
  trailing?: boolean

  /**
   * Maximum time `func` is allowed to be delayed before it's forcibly invoked.
   */
  maxWait?: number
}

export interface AsyncThrottleOptions {
  /**
   * Invoke on the leading edge of the window (immediately, on the first call).
   *
   * @default true
   */
  leading?: boolean

  /**
   * Invoke on the trailing edge of the window (after `wait` has elapsed).
   *
   * When `false`, calls dropped within the window (not served by a leading invocation) resolve
   * with `undefined`. There's no invocation for them to await. This is why the returned function
   * can resolve with `undefined` even though the original function's return type doesn't express that.
   *
   * @default true
   */
  trailing?: boolean
}

export interface AsyncDebounceOptions extends AsyncThrottleOptions {
  /**
   * Invoke on the leading edge of the window (immediately, on the first call).
   *
   * @default false
   */
  leading?: boolean

  /**
   * Maximum time `func` is allowed to be delayed before it's forcibly invoked.
   */
  maxWait?: number
}

/**
 * The function returned by `_asyncDebounce`/`_asyncThrottle`. Same signature as `T`, but resolves
 * `Awaited<ReturnType<T>> | undefined`
 *
 * This is because some configurations (e.g. `trailing: false`) may drop calls without invoking
 * the original function, so there's no result to await.
 */
export type AsyncDebounced<T extends AnyAsyncFunction> = ((
  this: ThisParameterType<T>,
  ...args: Parameters<T>
) => Promise<Awaited<ReturnType<T>> | undefined>) &
  Cancelable
