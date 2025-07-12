import type { AjvSchema, AjvValidationError } from '@naturalcycles/nodejs-lib/ajv'
import type { BackendRequest } from '../../server/server.model.js'
import { handleValidationError, type ReqValidationOptions } from '../validateRequest.util.js'

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
    return this.validate(req, 'headers', schema, opt)
  }

  private validate<T>(
    req: BackendRequest,
    reqProperty: 'body' | 'params' | 'query' | 'headers',
    schema: AjvSchema<T>,
    opt: ReqValidationOptions<AjvValidationError> = {},
  ): T {
    const { mutate } = opt
    const originalProperty = req[reqProperty] || {}
    const item: T = mutate ? originalProperty : { ...originalProperty }

    // Ajv mutates the input
    const error = schema.getValidationError(item, {
      objectName: `request ${reqProperty}`,
    })

    if (error) {
      handleValidationError(error, originalProperty, opt)
    }

    return item
  }
}

export const ajvValidateRequest = new AjvValidateRequest()
