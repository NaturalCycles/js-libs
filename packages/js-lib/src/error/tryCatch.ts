import { _since } from '../datetime/index.js'
import type { CommonLogger } from '../log/index.js'
import type { AnyFunction, UnixTimestampMillis } from '../types.js'
import { _anyToError } from './error.util.js'

export interface TryCatchOptions {
  /**
   * The value returned from the function will be returned from the wrapped method (!).
   * onError function may be asynchronous.
   */
  onError?: (err: Error) => any

  /**
   * @default false
   */
  logSuccess?: boolean

  /**
   * @default true
   */
  logError?: boolean

  /**
   * Default to `console`
   */
  logger?: CommonLogger
}

/**
 * Decorates a function with "try/catch", so it'll never reject/throw.
 * Only applies to async functions (or, turns sync function into async).
 *
 * Allows to pass onError callback.
 *
 * @experimental
 */
export function _tryCatch<T extends AnyFunction>(fn: T, opt: TryCatchOptions = {}): T {
  const { onError, logError = true, logSuccess = false, logger = console } = opt

  const fname = fn.name || 'anonymous'

  return async function (this: any, ...args: any[]) {
    const started = Date.now() as UnixTimestampMillis

    try {
      const r = await fn.apply(this, args)

      if (logSuccess) {
        logger.log(`tryCatch.${fname} succeeded in ${_since(started)}`)
      }

      return r
    } catch (err) {
      if (logError) {
        logger.warn(`tryCatch.${fname} error in ${_since(started)}:`, err)
      }

      if (onError) {
        try {
          return await onError(_anyToError(err))
        } catch {}
      }
      // returns undefined, but doesn't rethrow
    }
  } as any
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const _TryCatch =
  (opt: TryCatchOptions = {}): MethodDecorator =>
  (_target, _key, descriptor) => {
    const originalFn = descriptor.value
    descriptor.value = _tryCatch(originalFn as any, opt)
    return descriptor
  }
