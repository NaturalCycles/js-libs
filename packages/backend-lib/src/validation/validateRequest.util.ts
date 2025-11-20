import { AppError } from '@naturalcycles/js-lib/error/error.util.js'
import { _get } from '@naturalcycles/js-lib/object/object.util.js'

export function handleValidationError<T, ERR extends AppError>(
  error: ERR,
  originalProperty: T,
  opt: ReqValidationOptions<ERR> = {},
): never {
  let report: boolean | undefined
  if (typeof opt.report === 'boolean') {
    report = opt.report
  } else if (typeof opt.report === 'function') {
    report = opt.report(error)
  }

  if (opt.redactPaths) {
    redact(opt.redactPaths, originalProperty, error)
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
 * Mutates error
 */
function redact(redactPaths: string[], obj: any, error: Error): void {
  redactPaths
    .map(path => _get(obj, path) as string)
    .filter(Boolean)
    .forEach(secret => {
      error.message = error.message.replaceAll(secret, REDACTED)
    })
}

/**
 * Mutates error
 */
function makeErrorUserReadable<ERR extends AppError>(error: ERR): void {
  error.message = error.message.replaceAll('[Object: null prototype] ', '')
}

export interface ReqValidationOptions<ERR extends AppError> {
  /**
   * Pass a 'dot-paths' (e.g `pw`, or `input.pw`) that needs to be redacted from the output, in case of error.
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
