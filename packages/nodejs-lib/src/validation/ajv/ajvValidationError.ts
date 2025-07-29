import type { ErrorData } from '@naturalcycles/js-lib/error'
import { AppError } from '@naturalcycles/js-lib/error/error.util.js'
import type { ErrorObject } from 'ajv'

export interface AjvValidationErrorData extends ErrorData {
  errors: ErrorObject[]
  inputName?: string
  inputId?: string
}

export class AjvValidationError extends AppError<AjvValidationErrorData> {
  constructor(message: string, data: AjvValidationErrorData) {
    super(message, data, {
      name: 'AjvValidationError',
    })
  }
}
