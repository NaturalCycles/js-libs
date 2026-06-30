import type { AnyFunction } from '../types.js'

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
  let lastArgs: any
  let lastThis: any
  let result: any
  let timerId: number | undefined
  let lastCallTime: number | undefined

  let lastInvokeTime = 0
  const maxing = 'maxWait' in opt

  const { leading = false, trailing = true } = opt
  const maxWait = maxing ? Math.max(Number(opt.maxWait) || 0, wait) : opt.maxWait

  function invokeFunc(time: number): any {
    const args = lastArgs
    const thisArg = lastThis

    lastArgs = lastThis = undefined
    lastInvokeTime = time
    result = func.apply(thisArg, args)
    return result
  }

  function startTimer(pendingFunc: AnyFunction, wait: number): number {
    return setTimeout(pendingFunc, wait)
  }

  function cancelTimer(id: number): void {
    clearTimeout(id)
  }

  function leadingEdge(time: number): any {
    // Reset any `maxWait` timer.
    lastInvokeTime = time
    // Start the timer for the trailing edge.
    timerId = startTimer(timerExpired, wait)
    // Invoke the leading edge.
    return leading ? invokeFunc(time) : result
  }

  function remainingWait(time: number): number {
    const timeSinceLastCall = time - lastCallTime!
    const timeSinceLastInvoke = time - lastInvokeTime
    const timeWaiting = wait - timeSinceLastCall

    return maxing ? Math.min(timeWaiting, maxWait! - timeSinceLastInvoke) : timeWaiting
  }

  function shouldInvoke(time: number): boolean {
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

  function timerExpired(): any {
    const time = Date.now()
    if (shouldInvoke(time)) {
      return trailingEdge(time)
    }
    // Restart the timer.
    timerId = startTimer(timerExpired, remainingWait(time))
  }

  function trailingEdge(time: number): any {
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
    lastInvokeTime = 0
    lastArgs = lastCallTime = lastThis = timerId = undefined
  }

  function flush(): any {
    return timerId === undefined ? result : trailingEdge(Date.now())
  }

  function pending(): boolean {
    return timerId !== undefined
  }

  function debounced(this: any, ...args: any[]): any {
    const time = Date.now()
    const isInvoking = shouldInvoke(time)

    lastArgs = args
    lastThis = this
    lastCallTime = time

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime)
      }
      if (maxing) {
        // Handle invocations in a tight loop.
        timerId = startTimer(timerExpired, wait)
        return invokeFunc(lastCallTime)
      }
    }
    if (timerId === undefined) {
      timerId = startTimer(timerExpired, wait)
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
