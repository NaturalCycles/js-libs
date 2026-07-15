import { _anyToError } from '../error/error.util.js'
import { pDefer } from '../promise/pDefer.js'
import type { DeferredPromise } from '../promise/pDefer.js'
import type { AnyAsyncFunction, AnyFunction } from '../types.js'

export interface Cancelable {
  cancel: () => void
  flush: () => void
}

export interface ThrottleOptions {
  /**
   * @default true
   */
  leading?: boolean

  /**
   * @default true
   */
  trailing?: boolean
}

export interface DebounceOptions {
  /**
   * @default false
   */
  leading?: boolean

  /**
   * @default true
   */
  trailing?: boolean

  /**
   *
   */
  maxWait?: number
}

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
 * Unlike `_debounce` (which returns the previous invocation's stale `result` or `undefined`
 * for suppressed calls), `_asyncDebounce` always returns a real Promise. All calls that are
 * coalesced into a single invocation resolve (or reject) with that invocation's result.
 *
 * `cancel()` rejects any pending Promises, so awaiters never hang.
 *
 * @experimental
 */
export function _asyncDebounce<T extends AnyAsyncFunction>(
  func: T,
  wait: number,
  opt: DebounceOptions = {},
): T & Cancelable {
  let lastArgs: Parameters<T> | undefined
  let lastThis: ThisParameterType<T> | undefined
  let timerId: number | undefined
  // The Promise shared by all calls coalesced into the next invocation.
  // Undefined when there's no pending batch.
  let deferred: DeferredPromise<Awaited<ReturnType<T>>> | undefined

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

    // Detach the current batch's Promise and settle it with this invocation's result.
    const d = deferred!
    deferred = undefined
    try {
      const result = await func.apply(thisArg, args!)
      d.resolve(result)
    } catch (err) {
      d.reject(_anyToError(err))
    }
  }

  async function leadingEdge(time: number): Promise<Awaited<ReturnType<T>>> {
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
    // No invocation will happen for this batch (e.g. trailing=false) - resolve to
    // undefined rather than leaving awaiters hanging forever.
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
    // Reject pending awaiters so they don't hang.
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
  ): Promise<Awaited<ReturnType<T>>> {
    const time = Date.now()
    const isInvoking = shouldInvoke(time, state)

    lastArgs = args
    lastThis = this
    state.lastCallTime = time

    // Ensure a pending batch Promise exists for this call to join.
    deferred ||= pDefer<Awaited<ReturnType<T>>>()
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
  opt: ThrottleOptions = {},
): T & Cancelable {
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
