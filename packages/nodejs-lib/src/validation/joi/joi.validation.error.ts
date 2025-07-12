import type { ErrorData } from '@naturalcycles/js-lib/error'
import { AppError } from '@naturalcycles/js-lib/error/error.util.js'
import type { ValidationErrorItem } from 'joi'

/**
 * Example of ValidationErrorItem:
 *
 * {
 *   message: '"temperature" must be larger than or equal to 33',
 *   path: [ 'entries', 10, 'temperature' ],
 *   type: 'number.min',
 *   context: { limit: 33, value: 30, key: 'temperature', label: 'temperature' }
 * }
 */
export interface JoiValidationErrorData extends ErrorData {
  joiValidationErrorItems: ValidationErrorItem[]
  joiValidationObjectName?: string
  joiValidationObjectId?: string
  /**
   * Error "annotation" is stripped in Error.message.
   * This field contains the "full" annotation.
   *
   * This field is non-enumerable, won't be printed or included in JSON by default,
   * but still accessible programmatically (via `err.data.annotation`) when needed!
   */
  annotation?: string
}

export class JoiValidationError extends AppError<JoiValidationErrorData> {
  constructor(message: string, data: JoiValidationErrorData) {
    super(message, data, {
      name: 'JoiValidationError',
    })
  }
}
