import type { ErrorData } from '../error/error.model.js'
import { _errorDataAppend, TimeoutError } from '../error/error.util.js'
import type { AnyAsyncFunction, NumberOfMilliseconds } from '../types.js'
import { _typeCast } from '../types.js'

export interface PTimeoutOptions {
  /**
   * Timeout in milliseconds.
   *
   * If 0 is passed - the function would be executed right away, with no timeout.
   */
  timeout: NumberOfMilliseconds

  /**
   * If set - will be included in the error message.
   * Can be used to identify the place in the code that failed.
   */
  name?: string

  /**
   * If provided - will be called INSTEAD of throwing an error.
   * Can be used to thrown a custom error OR resolve a promise without throwing.
   *
   * err (which is TimeoutError) is passed as an argument for convenience, so it can
   * be logged or such. You don't have to consume it in any way though.
   */
  onTimeout?: (err: TimeoutError) => any

  /**
   * If passed - fakeError.stack will be used as a stacktrace.
   * This is to "keep stacktrace" when pTimeout is called from another
   * function (like pRetry).
   */
  fakeError?: Error

  /**
   * Will be merged with `err.data` object.
   */
  errorData?: ErrorData
}

/**
 * Decorates a Function with a timeout.
 * Returns a decorated Function.
 *
 * Throws an Error if the Function is not resolved in a certain time.
 * If the Function rejects - passes this rejection further.
 */
export function pTimeoutFn<T extends AnyAsyncFunction>(fn: T, opt: PTimeoutOptions): T {
  opt.name ||= fn.name

  if (!opt.timeout) {
    return fn
  }

  return async function pTimeoutInternalFn(this: any, ...args: any[]) {
    return await pTimeout(() => fn.apply(this, args), opt)
  } as T
}

/**
 * Decorates a Function with a timeout and immediately calls it.
 *
 * Throws an Error if the Function is not resolved in a certain time.
 * If the Function rejects - passes this rejection further.
 */
export async function pTimeout<T>(fn: AnyAsyncFunction<T>, opt: PTimeoutOptions): Promise<T> {
  if (!opt.timeout) {
    // short-circuit to direct execution if 0 timeout is passed
    return await fn()
  }

  const { timeout, name = fn.name || 'pTimeout function', onTimeout } = opt
  const fakeError = opt.fakeError || new Error('TimeoutError')

  // biome-ignore lint/suspicious/noAsyncPromiseExecutor: ok
  return await new Promise(async (resolve, reject) => {
    // Prepare the timeout timer
    const timer = setTimeout(() => {
      const err = new TimeoutError(`"${name}" timed out after ${timeout} ms`, opt.errorData)
      // keep original stack
      err.stack = fakeError.stack!.replace('Error: TimeoutError', 'TimeoutError: ' + err.message)

      if (onTimeout) {
        try {
          resolve(onTimeout(err))
        } catch (err: any) {
          _typeCast<Error>(err)
          // keep original stack
          err.stack = fakeError.stack!.replace('Error: TimeoutError', err.name + ': ' + err.message)
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(_errorDataAppend(err, opt.errorData))
        }
        return
      }

      reject(err)
    }, timeout)

    // Execute the Function
    try {
      resolve(await fn())
    } catch (err) {
      reject(err as Error)
    } finally {
      clearTimeout(timer)
    }
  })
}
