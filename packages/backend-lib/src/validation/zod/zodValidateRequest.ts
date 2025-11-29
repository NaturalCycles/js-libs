import { type ZodType, type ZodValidationError, zSafeValidate } from '@naturalcycles/js-lib/zod'
import type { BackendRequest } from '../../server/server.model.js'
import { handleValidationError, type ReqValidationOptions } from '../validateRequest.util.js'

class ZodValidateRequest {
  body<T>(
    req: BackendRequest,
    schema: ZodType<T>,
    opt: ReqValidationOptions<ZodValidationError> = {},
  ): T {
    return this.validate(req, 'body', schema, opt)
  }

  query<T>(
    req: BackendRequest,
    schema: ZodType<T>,
    opt: ReqValidationOptions<ZodValidationError> = {},
  ): T {
    return this.validate(req, 'query', schema, opt)
  }

  params<T>(
    req: BackendRequest,
    schema: ZodType<T>,
    opt: ReqValidationOptions<ZodValidationError> = {},
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
    schema: ZodType<T>,
    opt: ReqValidationOptions<ZodValidationError> = {},
  ): T {
    return this.validate(req, 'headers', schema, opt)
  }

  private validate<T>(
    req: BackendRequest,
    reqProperty: 'body' | 'params' | 'query' | 'headers',
    schema: ZodType<T>,
    opt: ReqValidationOptions<ZodValidationError> = {},
  ): T {
    const originalProperty = (req[reqProperty] || {}) as T

    // Zod does not mutate the input
    const [error, data] = zSafeValidate(
      originalProperty,
      schema,
      // opt2?.itemName,
    )

    if (error) {
      handleValidationError(error, originalProperty, opt)
    }

    // Kirill: decide to not do it, let's see
    // req[reqProperty] = data

    return data
  }
}

export const zodValidateRequest = new ZodValidateRequest()
