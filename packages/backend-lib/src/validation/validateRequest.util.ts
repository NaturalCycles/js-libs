import { AppError } from '@naturalcycles/js-lib/error/error.util.js'
import { _has, _set } from '@naturalcycles/js-lib/object/object.util.js'
import type { AnyObject } from '@naturalcycles/js-lib/types'

export function handleValidationError<ERR extends AppError>(
  error: ERR,
  opt: Pick<ReqValidationOptions<ERR>, 'report'> = {},
): never {
  let report: boolean | undefined
  if (typeof opt.report === 'boolean') {
    report = opt.report
  } else if (typeof opt.report === 'function') {
    report = opt.report(error)
  }

  makeErrorUserReadable(error)

  throw new AppError(error.message, {
    backendResponseStatusCode: 400,
    report,
    ...error.data,
  })
}

const REDACTED = 'REDACTED'

/**
 * Mutates `input`: replaces the value at each existing `redactPaths` dot-path with 'REDACTED',
 * whatever its type. Paths that don't exist are skipped - no keys are created.
 */
export function redactInputByPaths<T extends AnyObject>(input: T, redactPaths: string[]): T {
  for (const path of redactPaths) {
    if (_has(input, path)) {
      _set(input, path, REDACTED)
    }
  }
  return input
}

/**
 * Mutates error
 */
function makeErrorUserReadable<ERR extends AppError>(error: ERR): void {
  error.message = error.message.replaceAll('[Object: null prototype] ', '')
}

export interface ReqValidationOptions<ERR extends AppError> {
  /**
   * Pass 'dot-paths' (e.g `pw`, or `input.pw`, or `items.0.secret`) that need to be redacted
   * from the error message, in case of error. The whole value at each path is replaced with
   * 'REDACTED', whatever its type.
   * Useful e.g to redact (prevent leaking) plaintext passwords in error messages.
   */
  redactPaths?: string[]

  /**
   * Set to true, or a function that returns true/false based on the error generated.
   * If true - `genericErrorHandler` will report it to errorReporter (aka Sentry).
   */
  report?: boolean | ((err: ERR) => boolean)

  /**
   * Defaults to false, because it promotes type safe thinking.
   *
   * If set to true, AJV will try to coerce the types after the validation fails and retry the validation.
   *
   * To be used in places where we know that we are going to receive data with the wrong type,
   * typically: request path params and request query params.
   */
  coerceTypes?: boolean

  /**
   * Default value depends on the implementation and the object.
   * Joi and Zod do not mutate input (even if you pass `mutateInput: true` - that feature is not supported).
   * AJV by default does mutate the input, but depending on the property:
   *
   * body - will be mutated, by req.rawBody will be used (if available) for error message snippet
   * params, query - will NOT mutate by default (unless you pass `mutateInput: true`)
   * headers - will NOT mutate by default
   */
  mutateInput?: boolean
}
