import { _since } from '../datetime/index.js'
import { _errorDataAppend, type ErrorData } from '../error/index.js'
import type { CommonLogger } from '../log/index.js'
import type { AnyFunction, UnixTimestampMillis } from '../types.js'
import { pDelay } from './pDelay.js'
import { pTimeout } from './pTimeout.js'

export interface PRetryOptions {
  /**
   * If set - will be included in the error message.
   * Can be used to identify the place in the code that failed.
   */
  name?: string

  /**
   * Timeout for each Try, in milliseconds.
   *
   * Defaults to no timeout.
   */
  timeout?: number

  /**
   * How many attempts to try.
   * First attempt is not a retry, but "initial try". It still counts.
   * maxAttempts of 4 will be 1 try and 3 retries.
   *
   * @default 4
   */
  maxAttempts?: number

  /**
   * @default 1000 ms
   */
  delay?: number

  /**
   * @default 2
   */
  delayMultiplier?: number

  /**
   * Called on every retry (since 2nd attempt, cause 1st attempt is not a retry).
   *
   * True - keep retrying.
   * False - stop retrying and return immediately.
   *
   * @default () => true
   */
  predicate?: (err: Error, attempt: number, maxAttempts: number) => boolean

  /**
   * Log the first attempt (which is not a "retry" yet).
   *
   * @default false
   */
  logFirstAttempt?: boolean

  /**
   * Log retries - attempts that go after the first one.
   *
   * @default true
   */
  logRetries?: boolean

  /**
   * @default false
   */
  logSuccess?: boolean

  /**
   * @default true
   */
  logFailures?: boolean

  /**
   * @default false
   */
  logAll?: boolean

  /**
   * @default false
   */
  logNone?: boolean

  /**
   * Default to `console`
   */
  logger?: CommonLogger

  /**
   * Will be merged with `err.data` object.
   */
  errorData?: ErrorData
}

/**
 * Returns a Function (!), enhanced with retry capabilities.
 * Implements "Exponential back-off strategy" by multiplying the delay by `delayMultiplier` with each try.
 */
export function pRetryFn<T extends AnyFunction>(fn: T, opt: PRetryOptions = {}): T {
  return async function pRetryFunction(this: any, ...args: any[]) {
    return await pRetry(() => fn.call(this, ...args), opt)
  } as any
}

export async function pRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opt: PRetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 4,
    delay: initialDelay = 1000,
    delayMultiplier = 2,
    predicate,
    logger = console,
    name,
    timeout,
  } = opt

  const fakeError = timeout ? new Error('TimeoutError') : undefined
  let { logFirstAttempt = false, logRetries = true, logFailures = true, logSuccess = false } = opt

  if (opt.logAll) {
    logSuccess = logFirstAttempt = logRetries = logFailures = true
  }
  if (opt.logNone) {
    logSuccess = logFirstAttempt = logRetries = logFailures = false
  }

  const fname = name || fn.name || 'pRetry function'

  let delay = initialDelay
  let attempt = 0

  while (true) {
    const started = Date.now() as UnixTimestampMillis

    try {
      attempt++
      if ((attempt === 1 && logFirstAttempt) || (attempt > 1 && logRetries)) {
        logger.log(`${fname} attempt #${attempt}...`)
      }

      let result: any

      if (timeout) {
        result = await pTimeout(async () => await fn(attempt), {
          timeout,
          name: fname,
          errorData: opt.errorData,
          fakeError,
        })
      } else {
        result = await fn(attempt)
      }

      if (logSuccess) {
        logger.log(`${fname} attempt #${attempt} succeeded in ${_since(started)}`)
      }

      return result
    } catch (err) {
      if (logFailures) {
        // Logger at warn (not error) level, because it's not a fatal error, but a retriable one
        // Fatal one is not logged either, because it's been thrown instead
        logger.warn(`${fname} attempt #${attempt} error in ${_since(started)}:`, err)
      }

      if (attempt >= maxAttempts || (predicate && !predicate(err as Error, attempt, maxAttempts))) {
        // Give up
        throw _errorDataAppend(err, opt.errorData)
      }

      // Retry after delay
      delay *= delayMultiplier
      await pDelay(delay)
      // back to while(true) loop
    }
  }
}
