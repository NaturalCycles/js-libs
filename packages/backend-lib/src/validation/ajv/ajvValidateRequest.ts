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
    const { mutateInput = true } = opt
    const input: T = req[reqProperty] || {}

    const [error, output] = schema.getValidationResult(input, {
      mutateInput,
      inputName: `request ${reqProperty}`,
    })

    if (error) {
      handleValidationError(error, input, opt)
    }

    return output
  }
}

export const ajvValidateRequest = new AjvValidateRequest()
