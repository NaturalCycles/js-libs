import type { AnySchema, JoiValidationError } from '@naturalcycles/nodejs-lib/joi'
import { getValidationResult } from '@naturalcycles/nodejs-lib/joi'
import type { BackendRequest } from '../../server/server.model.js'
import { handleValidationError, type ReqValidationOptions } from '../validateRequest.util.js'

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
    return this.validate(req, 'headers', schema, opt)
  }

  private validate<T>(
    req: BackendRequest,
    reqProperty: 'body' | 'params' | 'query' | 'headers',
    schema: AnySchema<T>,
    opt: ReqValidationOptions<JoiValidationError> = {},
  ): T {
    const { mutateInput } = opt
    const originalProperty = req[reqProperty] || {}

    // Joi does not mutate the input
    const [error, value] = getValidationResult(originalProperty, schema, `request ${reqProperty}`)

    if (error) {
      if (opt.redactPaths) {
        error.data.joiValidationErrorItems.length = 0 // clears the array
        delete error.data.annotation
      }

      handleValidationError(error, originalProperty, opt)
    }

    if (mutateInput) {
      req[reqProperty] = value
    }

    return value
  }
}

export const validateRequest = new ValidateRequest()
