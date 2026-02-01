import { AjvSchema, getCoercingAjv } from '@naturalcycles/nodejs-lib/ajv'
import type { AjvValidationError, SchemaHandledByAjv } from '@naturalcycles/nodejs-lib/ajv'
import type { BackendRequest } from '../../server/server.model.js'
import { handleValidationError } from '../validateRequest.util.js'
import type { ReqValidationOptions } from '../validateRequest.util.js'

class AjvValidateRequest {
  body<IN, OUT>(
    req: BackendRequest,
    schema: SchemaHandledByAjv<IN, OUT>,
    opt: ReqValidationOptions<AjvValidationError> = {},
  ): OUT {
    return this.validate(
      req,
      'body',
      schema,
      req.rawBody?.byteLength ? () => JSON.parse(req.rawBody!.toString()) : undefined,
      opt,
    )
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
    const originalQuery = JSON.stringify(req.query)
    return this.validate(req, 'query', schema, () => JSON.parse(originalQuery), {
      coerceTypes: true,
      ...opt,
    })
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
    const originalParams = JSON.stringify(req.params)
    return this.validate(req, 'params', schema, () => JSON.parse(originalParams), {
      coerceTypes: true,
      ...opt,
    })
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
    return this.validate(req, 'headers', schema, undefined, {
      mutateInput: false,
      ...opt,
    })
  }

  private validate<IN, OUT>(
    req: BackendRequest,
    reqProperty: 'body' | 'params' | 'query' | 'headers',
    schema: SchemaHandledByAjv<IN, OUT>,
    getOriginalInput?: () => IN,
    opt: ReqValidationOptions<AjvValidationError> = {},
  ): OUT {
    const input = (req[reqProperty] || {}) as IN

    const { coerceTypes, mutateInput } = opt
    const ajv = coerceTypes ? getCoercingAjv() : undefined
    const ajvSchema = AjvSchema.create(schema, { ajv })

    const [error, output] = ajvSchema.getValidationResult(input, {
      inputName: `request.${reqProperty}`,
      getOriginalInput,
      mutateInput,
    })

    if (error) {
      handleValidationError(error, input, opt)
    }

    return output
  }
}

export const validateRequest = new AjvValidateRequest()
