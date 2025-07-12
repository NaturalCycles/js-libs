import { AppError } from '@naturalcycles/js-lib/error/error.util.js'
import { _get } from '@naturalcycles/js-lib/object/object.util.js'

export function handleValidationError<T, ERR extends AppError>(
  error: ERR,
  originalProperty: T,
  opt: ReqValidationOptions<ERR> = {},
): never {
  // const item: T = opt.mutate ? { ...req[reqProperty] } : (req[reqProperty] || {})

  let report: boolean | undefined
  if (typeof opt.report === 'boolean') {
    report = opt.report
  } else if (typeof opt.report === 'function') {
    report = opt.report(error)
  }

  if (opt.redactPaths) {
    redact(opt.redactPaths, originalProperty, error)
  }

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
   * When set to true, the validated object will not be replaced with the Joi-converted value.
   *
   * Defaults to true.
   * Exception is `headers` validation, where the default is `false`.
   *
   * To avoid mutation - shallow copy is performed.
   */
  mutate?: boolean
}
