import { _get, AppError } from '@naturalcycles/js-lib'
import type { AjvSchema, AjvValidationError } from '@naturalcycles/nodejs-lib/ajv'
import type { BackendRequest } from '../../server/server.model.js'
import type { ReqValidationOptions } from '../joi/joiValidateRequest.js'

class AjvValidateRequest {
  body<T>(
    req: BackendRequest,
    schema: AjvSchema<T>,
    opt: ReqValidationOptions<AjvValidationError> = {},
  ): T {
    return this.validate(req, 'body', schema, opt)
  }

  query<T>(
    req: BackendRequest,
    schema: AjvSchema<T>,
    opt: ReqValidationOptions<AjvValidationError> = {},
  ): T {
    return this.validate(req, 'query', schema, opt)
  }

  params<T>(
    req: BackendRequest,
    schema: AjvSchema<T>,
    opt: ReqValidationOptions<AjvValidationError> = {},
  ): T {
    return this.validate(req, 'params', schema, opt)
  }

  /**
   * Validates `req.headers` against the provided schema.
   *
   * Note: as opposed to other methods, this method does not mutate `req.headers` in case of success,
   * i.e. schemas that cast values will not have any effect.
   *
   * If you wish to mutate `req.headers` with the validated value, use `keepOriginal: false` option.
   * Keep in mind that this will also remove all values that are not in the schema.
   */
  headers<T>(
    req: BackendRequest,
    schema: AjvSchema<T>,
    opt: ReqValidationOptions<AjvValidationError> = {},
  ): T {
    const options: ReqValidationOptions<AjvValidationError> = {
      keepOriginal: true,
      ...opt,
    }
    return this.validate(req, 'headers', schema, options)
  }

  private validate<T>(
    req: BackendRequest,
    reqProperty: 'body' | 'params' | 'query' | 'headers',
    schema: AjvSchema<T>,
    opt: ReqValidationOptions<AjvValidationError> = {},
  ): T {
    const value: T = { ...req[reqProperty] } // destructure to avoid being mutated by Ajv
    // It will mutate the `value`, but not the original object
    const error = schema.getValidationError(value, {
      objectName: `request ${reqProperty}`,
    })

    if (error) {
      let report: boolean | undefined
      if (typeof opt.report === 'boolean') {
        report = opt.report
      } else if (typeof opt.report === 'function') {
        report = opt.report(error)
      }

      if (opt.redactPaths) {
        redact(opt.redactPaths, req[reqProperty], error)
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

export const ajvValidateRequest = new AjvValidateRequest()

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
