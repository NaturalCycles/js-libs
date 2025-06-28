import type { ZodError, ZodType } from 'zod/v4'
import type { ErrorData } from '../error/error.model.js'
import { AppError } from '../error/error.util.js'
import { _stringify } from '../string/stringify.js'

export interface ZodErrorResult<T> {
  success: false
  data?: T
  error: ZodValidationError
}

export interface ZodSuccessResult<T> {
  success: true
  data: T
  error?: ZodValidationError
}

export function zIsValid<T>(value: T, schema: ZodType<T>): boolean {
  const { success } = schema.safeParse(value)
  return success
}

export function zValidate<T>(value: T, schema: ZodType<T>): T {
  const r = zSafeValidate(value, schema)
  if (r.success) {
    return r.data
  }

  throw r.error
}

export function zSafeValidate<T>(
  value: T,
  schema: ZodType<T>,
  // objectName?: string,
): ZodSuccessResult<T> | ZodErrorResult<T> {
  const r = schema.safeParse(value)
  if (r.success) {
    return r
  }

  return {
    success: false,
    error: new ZodValidationError(r.error, value, schema),
  }
}

export interface ZodValidationErrorData extends ErrorData {
  // issues: $ZodIssue[]
  // joiValidationObjectName?: string
  // joiValidationObjectId?: string
  /**
   * Error "annotation" is stripped in Error.message.
   * This field contains the "full" annotation.
   *
   * This field is non-enumerable, won't be printed or included in JSON by default,
   * but still accessible programmatically (via `err.data.annotation`) when needed!
   */
  // annotation?: string
}

export class ZodValidationError extends AppError<ZodValidationErrorData> {
  constructor(zodError: ZodError, value: any, schema: ZodType) {
    const message = createZodErrorMessage(zodError, schema, value)
    // const message = z.prettifyError(zodError) // todo: consider adopting it instead
    super(message, {}, { name: 'ZodValidationError' })
  }
}

function createZodErrorMessage<T>(err: ZodError<T>, schema: ZodType<T>, value: T): string {
  let objectTitle = schema.description

  if (typeof value === 'object' && value) {
    const objectName = schema.description || value.constructor?.name
    const objectId = (value as any)['id'] as string
    objectTitle = [objectName, objectId].filter(Boolean).join('.')
  }

  objectTitle ||= 'data'

  return [
    `Invalid ${objectTitle}`,
    '',
    'Input:',
    _stringify(value),
    err.issues.length > 1 ? `\n${err.issues.length} issues:` : '',
    ...err.issues.slice(0, 100).map(i => {
      return [i.path.join('.'), i.message].filter(Boolean).join(': ')
    }),
  ].join('\n')
}
