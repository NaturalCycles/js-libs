import { _ms } from '../datetime/time.util.js'
import { _assert } from '../error/assert.js'
import type { CommonLogger } from '../log/commonLogger.js'
import { SimpleMovingAverage } from '../math/sma.js'
import { _stringify } from '../string/stringify.js'
import { _getArgsSignature, _getMethodSignature } from './decorator.util.js'

/**
 * $r - result
 *
 * @returns array of tokens that will be `.filter(Boolean).join(' ')`
 */
type LogResultFn = (r: any) => any[]

export interface LogMethodOptions {
  /**
   * Log "moving average" elapsed time for up to `avg` last method calls
   */
  avg?: number

  /**
   * Defaults to true.
   * Set to false to skip logging method arguments
   */
  logArgs?: boolean

  /**
   * Defaults to true.
   * Set to false to skip logging result length when result is an array.
   */
  logResultLength?: boolean

  /**
   * Also log on method start.
   * Example:
   *
   * >> syncMethodSuccess()
   */
  logStart?: boolean

  /**
   * Log method result as is (stringified).
   * Example:
   *
   * * << syncMethodSuccess() took 124 ms result: 'SomeString as result'
   */
  logResult?: boolean

  /**
   * Log method result via provided function that takes "result as is" as first argument and should return a String.
   * Overrides `logResult`.
   */
  logResultFn?: LogResultFn

  /**
   * Defaults to `console`
   */
  logger?: CommonLogger
}

/**
 * Console-logs when method had started, when it finished, time taken and if error happened.
 * Supports both sync and async methods.
 * Awaits if method returns a Promise.
 *
 * @example output:
 *
 * >> syncMethodSuccess()
 * << syncMethodSuccess() took 124 ms
 *
 * >> asyncMethod()
 * << asyncMethodThrow() took 10 ms ERROR: MyError
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export function _LogMethod(opt: LogMethodOptions = {}): MethodDecorator {
  return (_target, key, descriptor) => {
    _assert(typeof descriptor.value === 'function', '@_LogMethod can be applied only to methods')

    const originalFn = descriptor.value
    const keyStr = String(key)

    const {
      avg,
      logArgs = true,
      logStart,
      logResult,
      logResultLength = true,
      logger = console,
    } = opt
    let { logResultFn } = opt
    if (!logResultFn) {
      if (logResult) {
        logResultFn = r => ['result:', _stringify(r)]
      } else if (logResultLength) {
        logResultFn = r => (Array.isArray(r) ? [`result: ${r.length} items`] : [])
      }
    }

    const sma = avg ? new SimpleMovingAverage(avg) : undefined
    let count = 0

    descriptor.value = function (this: typeof _target, ...args: any[]) {
      const started = Date.now()
      const ctx = this

      // e.g `NameOfYourClass.methodName`
      // or `NameOfYourClass(instanceId).methodName`
      const methodSignature = _getMethodSignature(ctx, keyStr)
      const argsStr = _getArgsSignature(args, logArgs)
      const callSignature = `${methodSignature}(${argsStr}) #${++count}`
      if (logStart) logger.log(`>> ${callSignature}`)

      try {
        const res = originalFn.apply(ctx, args)

        if (res && typeof res.then === 'function') {
          // Result is a Promise, will wait for resolution or rejection
          return res
            .then((r: any) => {
              logFinished(logger, callSignature, started, sma, logResultFn, r)
              return r
            })
            .catch((err: any) => {
              logFinished(logger, callSignature, started, sma, logResultFn, undefined, err)
              throw err
            })
        }
        // not a Promise
        logFinished(logger, callSignature, started, sma, logResultFn, res)
        return res
      } catch (err) {
        logFinished(logger, callSignature, started, sma, logResultFn, undefined, err)
        throw err // rethrow
      }
    } as any

    return descriptor
  }
}

// oxlint-disable-next-line max-params
function logFinished(
  logger: CommonLogger,
  callSignature: string,
  started: number,
  sma?: SimpleMovingAverage,
  logResultFn?: LogResultFn,
  res?: any,
  err?: any,
): void {
  const millis = Date.now() - started

  const t = ['<<', callSignature, 'took', _ms(millis)]

  if (sma) {
    t.push(`(avg ${_ms(sma.pushGetAvg(millis))})`)
  }

  if (err !== undefined) {
    t.push('ERROR:', err)
  } else if (logResultFn) {
    t.push(...logResultFn(res))
  }

  logger.log(...t.filter(Boolean))
}
