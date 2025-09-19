import { _deepCopy } from '@naturalcycles/js-lib/object'
import type { ZodType } from '@naturalcycles/js-lib/zod'
import { AjvSchema, type AjvValidationError } from '@naturalcycles/nodejs-lib/ajv'
import type { BackendRequest } from '../../server/server.model.js'
import { handleValidationError, type ReqValidationOptions } from '../validateRequest.util.js'

class AjvValidateRequest {
  body<T>(
    req: BackendRequest,
    schema: AjvSchema<T> | ZodType<T>,
    opt: ReqValidationOptions<AjvValidationError> = {},
  ): T {
    return this.validate(req, 'body', schema, opt)
  }

  query<T>(
    req: BackendRequest,
    schema: AjvSchema<T> | ZodType<T>,
    opt: ReqValidationOptions<AjvValidationError> = {},
  ): T {
    return this.validate(req, 'query', schema, opt)
  }

  params<T>(
    req: BackendRequest,
    schema: AjvSchema<T> | ZodType<T>,
    opt: ReqValidationOptions<AjvValidationError> = {},
  ): T {
    return this.validate(req, 'params', schema, opt)
  }

  /**
   * Does NOT mutate `req.headers`,
   * but returns validated/transformed headers.
   *
   * For headers we have a different behavior compared to body/query/params.
   * We want to non-mutate the `req.headers`, because we anticipate that
   * there may be additional consumers for `req.headers` (e.g middlewares, etc).
   */
  headers<T>(
    req: BackendRequest,
    schema: AjvSchema<T>,
    opt: ReqValidationOptions<AjvValidationError> = {},
  ): T {
    const originalHeaders = _deepCopy(req.headers)
    const headers = this.validate(req, 'headers', schema, opt)
    req.headers = originalHeaders
    return headers
  }

  private validate<T>(
    req: BackendRequest,
    reqProperty: 'body' | 'params' | 'query' | 'headers',
    schema: AjvSchema<T> | ZodType<T>,
    opt: ReqValidationOptions<AjvValidationError> = {},
  ): T {
    const input: T = req[reqProperty] || {}
    const ajvSchema = AjvSchema.create(schema)

    const [error, output] = ajvSchema.getValidationResult(input, {
      inputName: `request ${reqProperty}`,
    })

    if (error) {
      handleValidationError(error, input, opt)
    }

    return output
  }
}

export const ajvValidateRequest = new AjvValidateRequest()
