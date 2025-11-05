import { _deepCopy } from '@naturalcycles/js-lib/object'
import {
  AjvSchema,
  type AjvValidationError,
  getCoercingAjv,
  type SchemaHandledByAjv,
} from '@naturalcycles/nodejs-lib/ajv'
import type { BackendRequest } from '../../server/server.model.js'
import { handleValidationError, type ReqValidationOptions } from '../validateRequest.util.js'

class AjvValidateRequest {
  body<IN, OUT>(
    req: BackendRequest,
    schema: SchemaHandledByAjv<IN, OUT>,
    opt: ReqValidationOptions<AjvValidationError> = {},
  ): OUT {
    return this.validate(req, 'body', schema, opt)
  }

  /**
   * Query validation uses type coercion (unlike body validation),
   * so the passed in schemas do not need to specify only string values.
   *
   * Coercion mutates the input, even if the end result is that the input failed the validation.
   */
  query<IN, OUT>(
    req: BackendRequest,
    schema: SchemaHandledByAjv<IN, OUT>,
    opt: ReqValidationOptions<AjvValidationError> = {},
  ): OUT {
    return this.validate(req, 'query', schema, { coerceTypes: true, ...opt })
  }

  /**
   * Params validation uses type coercion (unlike body validation),
   * so the passed in schemas do not need to specify only string values.
   *
   * Coercion mutates the input, even if the end result is that the input failed the validation.
   */
  params<IN, OUT>(
    req: BackendRequest,
    schema: SchemaHandledByAjv<IN, OUT>,
    opt: ReqValidationOptions<AjvValidationError> = {},
  ): OUT {
    return this.validate(req, 'params', schema, { coerceTypes: true, ...opt })
  }

  /**
   * Does NOT mutate `req.headers`,
   * but returns validated/transformed headers.
   *
   * For headers we have a different behavior compared to body/query/params.
   * We want to non-mutate the `req.headers`, because we anticipate that
   * there may be additional consumers for `req.headers` (e.g middlewares, etc).
   */
  headers<IN, OUT>(
    req: BackendRequest,
    schema: SchemaHandledByAjv<IN, OUT>,
    opt: ReqValidationOptions<AjvValidationError> = {},
  ): OUT {
    const originalHeaders = _deepCopy(req.headers)
    const headers = this.validate(req, 'headers', schema, opt)
    req.headers = originalHeaders
    return headers
  }

  private validate<IN, OUT>(
    req: BackendRequest,
    reqProperty: 'body' | 'params' | 'query' | 'headers',
    schema: SchemaHandledByAjv<IN, OUT>,
    opt: ReqValidationOptions<AjvValidationError> = {},
  ): OUT {
    const input: IN = req[reqProperty] || {}

    const { coerceTypes } = opt
    const ajv = coerceTypes ? getCoercingAjv() : undefined
    const ajvSchema = AjvSchema.create(schema, { ajv })

    const [error, output] = ajvSchema.getValidationResult(input, {
      inputName: `request.${reqProperty}`,
    })

    if (error) {
      handleValidationError(error, input, opt)
    }

    return output
  }
}

export const ajvValidateRequest = new AjvValidateRequest()
