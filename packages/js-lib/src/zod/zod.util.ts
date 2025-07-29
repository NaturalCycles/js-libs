import type { ZodError, ZodType } from 'zod'
import { _assert } from '../error/assert.js'
import type { ErrorData } from '../error/error.model.js'
import { AppError } from '../error/error.util.js'
import { _stringify } from '../string/stringify.js'
import type { ValidationFunction, ValidationFunctionResult } from '../validation/validation.js'

export function zGetValidationFunction<T>(
  schema: ZodType<T>,
): ValidationFunction<T, ZodValidationError> {
  return (input, opt) => {
    _assert(!opt?.mutateInput, 'mutateInput=true is not yet supported with Zod')
    return zSafeValidate(input, schema)
  }
}

export function zIsValid<T>(value: T, schema: ZodType<T>): boolean {
  const { success } = schema.safeParse(value)
  return success
}

export function zValidate<T>(value: T, schema: ZodType<T>): T {
  const [err, data] = zSafeValidate(value, schema)
  if (err) throw err
  return data
}

export function zSafeValidate<T>(
  input: T,
  schema: ZodType<T>,
  // inputName?: string,
): ValidationFunctionResult<T, ZodValidationError> {
  const r = schema.safeParse(input)
  if (r.success) {
    return [null, r.data]
  }

  return [new ZodValidationError(r.error, input, schema), r.data ?? input]
}

export interface ZodValidationErrorData extends ErrorData {}

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
    const inputName = schema.description || value.constructor?.name
    const inputId = (value as any)['id'] as string
    objectTitle = [inputName, inputId].filter(Boolean).join('.')
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
