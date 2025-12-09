/**
 * Similar to Deferred object, which is also a promise itself (instead of deferred.promise).
 */
export interface DeferredPromise<T = void> extends Promise<T> {
  resolve: (a?: T) => void
  reject: (err?: Error) => void

  /**
   * Can be overridden.
   * Otherwise will reject with "Aborted" or "Aborted: $reason" on abort().
   *
   * @experimental
   */
  abort: (reason?: string) => void

  /**
   * Rejects the promise with `new Error('Aborted: $reason')`.
   *
   * @experimental
   */
  rejectAborted: (reason?: string) => void
}

/* oxlint-disable @typescript-eslint/promise-function-async */

/**
 * Returns DeferredPromise - a Promise that has .resolve() and .reject() methods.
 */
export function pDefer<T = void>(): DeferredPromise<T> {
  let resolve: any
  let reject: any

  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  }) as DeferredPromise<T>

  promise.resolve = resolve
  promise.reject = reject
  promise.rejectAborted = reason =>
    reject(new Error(['Aborted', reason].filter(Boolean).join(': ')))
  promise.abort = reason => promise.rejectAborted(reason)

  return promise
}
