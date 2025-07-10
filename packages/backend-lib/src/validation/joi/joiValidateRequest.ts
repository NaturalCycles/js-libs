import { _get, AppError } from '@naturalcycles/js-lib'
import type { AnySchema, JoiValidationError } from '@naturalcycles/nodejs-lib/joi'
import { getValidationResult } from '@naturalcycles/nodejs-lib/joi'
import type { BackendRequest } from '../../server/server.model.js'

export interface ReqValidationOptions<ERR extends Error> {
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
   * The general default is `false`, with the excepction of `headers` validation, where the default is `true`.
   */
  keepOriginal?: boolean
}

class ValidateRequest {
  body<T>(
    req: BackendRequest,
    schema: AnySchema<T>,
    opt: ReqValidationOptions<JoiValidationError> = {},
  ): T {
    return this.validate(req, 'body', schema, opt)
  }

  query<T>(
    req: BackendRequest,
    schema: AnySchema<T>,
    opt: ReqValidationOptions<JoiValidationError> = {},
  ): T {
    return this.validate(req, 'query', schema, opt)
  }

  params<T>(
    req: BackendRequest,
    schema: AnySchema<T>,
    opt: ReqValidationOptions<JoiValidationError> = {},
  ): T {
    return this.validate(req, 'params', schema, opt)
  }

  /**
   * Validates `req.headers` against the provided Joi schema.
   *
   * Note: as opposed to other methods, this method does not mutate `req.headers` in case of success,
   * i.e. schemas that cast values will not have any effect.
   *
   * If you wish to mutate `req.headers` with the validated value, use `keepOriginal: false` option.
   * Keep in mind that this will also remove all values that are not in the schema.
   */
  headers<T>(
    req: BackendRequest,
    schema: AnySchema<T>,
    opt: ReqValidationOptions<JoiValidationError> = {},
  ): T {
    const options: ReqValidationOptions<JoiValidationError> = {
      keepOriginal: true,
      ...opt,
    }
    return this.validate(req, 'headers', schema, options)
  }

  private validate<T>(
    req: BackendRequest,
    reqProperty: 'body' | 'params' | 'query' | 'headers',
    schema: AnySchema<T>,
    opt: ReqValidationOptions<JoiValidationError> = {},
  ): T {
    const { value, error } = getValidationResult(
      req[reqProperty] || {},
      schema,
      `request ${reqProperty}`,
    )
    if (error) {
      let report: boolean | undefined
      if (typeof opt.report === 'boolean') {
        report = opt.report
      } else if (typeof opt.report === 'function') {
        report = opt.report(error)
      }

      if (opt.redactPaths) {
        redact(opt.redactPaths, req[reqProperty], error)
        error.data.joiValidationErrorItems.length = 0 // clears the array
        delete error.data.annotation
      }

      throw new AppError(error.message, {
        backendResponseStatusCode: 400,
        report,
        ...error.data,
      })
    }

    // mutate req to replace the property with the value, converted by Joi
    if (!opt.keepOriginal && reqProperty !== 'query') {
      // query is read-only in Express 5
      req[reqProperty] = value
    }

    return value
  }
}

export const validateRequest = new ValidateRequest()

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
