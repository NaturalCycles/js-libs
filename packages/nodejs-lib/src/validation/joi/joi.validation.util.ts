/*
 * Does 2 things:
 * 1. Validates the value according to Schema passed.
 * 2. Converts the value (also according to Schema).
 *
 * "Converts" mean e.g trims all strings from leading/trailing spaces.
 */

import { _hb, _isObject } from '@naturalcycles/js-lib'
import { _truncateMiddle } from '@naturalcycles/js-lib/string'
import type { AnySchema, ValidationError, ValidationOptions } from 'joi'
import type { JoiValidationErrorData } from './joi.validation.error.js'
import { JoiValidationError } from './joi.validation.error.js'

// todo: consider replacing with Tuple of [error, value]
export interface JoiValidationResult<T = any> {
  value: T
  error?: JoiValidationError
}

// Strip colors in production (for e.g Sentry reporting)
// const stripColors = process.env.NODE_ENV === 'production' || !!process.env.GAE_INSTANCE
// Currently colors do more bad than good, so let's strip them always for now
const stripColors = true

const defaultOptions: ValidationOptions = {
  abortEarly: false,
  convert: true,
  allowUnknown: true,
  stripUnknown: {
    objects: true,
    // true: it will SILENTLY strip invalid values from arrays. Very dangerous! Can lead to data loss!
    // false: it will THROW validation error if any of array items is invalid
    // Q: is it invalid if it has unknown properties?
    // A: no, unknown properties are just stripped (in both 'false' and 'true' states), array is still valid
    // Q: will it strip or keep unknown properties in array items?..
    // A: strip
    arrays: false, // let's be very careful with that! https://github.com/hapijs/joi/issues/658
  },
  presence: 'required',
  // errors: {
  //   stack: true,
  // }
}

/**
 * Validates with Joi.
 * Throws JoiValidationError if invalid.
 * Returns *converted* value.
 *
 * If `schema` is undefined - returns value as is.
 */
export function validate<T>(
  input: any,
  schema?: AnySchema<T>,
  objectName?: string,
  opt: ValidationOptions = {},
): T {
  const { value: returnValue, error } = getValidationResult(input, schema, objectName, opt)

  if (error) {
    throw error
  }

  return returnValue
}

/**
 * Validates with Joi.
 * Returns JoiValidationResult with converted value and error (if any).
 * Does not throw.
 *
 * Joi does NOT mutate the input.
 *
 * If `schema` is undefined - returns value as is.
 */
export function getValidationResult<T>(
  input: any,
  schema?: AnySchema<T>,
  objectName?: string,
  options: ValidationOptions = {},
): JoiValidationResult<T> {
  if (!schema) return { value: input }

  const { value, error } = schema.validate(input, {
    ...defaultOptions,
    ...options,
  })

  const vr: JoiValidationResult<T> = {
    value,
  }

  if (error) {
    vr.error = createError(input, error, objectName)
  }

  return vr
}

/**
 * Convenience function that returns true if !error.
 */
export function isValid<T>(input: T, schema?: AnySchema<T>): boolean {
  if (!schema) return true

  const { error } = schema.validate(input, defaultOptions)
  return !error
}

export function undefinedIfInvalid<T>(input: any, schema?: AnySchema<T>): T | undefined {
  if (!schema) return input

  const { value, error } = schema.validate(input, defaultOptions)

  return error ? undefined : value
}

/**
 * Will do joi-conversion, regardless of error/validity of value.
 *
 * @returns converted value
 */
export function convert<T>(input: any, schema?: AnySchema<T>): T {
  if (!schema) return input
  const { value } = schema.validate(input, defaultOptions)
  return value
}

function createError(value: any, err: ValidationError, objectName?: string): JoiValidationError {
  const tokens: string[] = []

  const objectId = _isObject(value) ? (value['id'] as string) : undefined

  if (objectId || objectName) {
    objectName ||= value?.constructor?.name

    tokens.push('Invalid ' + [objectName, objectId].filter(Boolean).join('.'))
  }

  const annotation = err.annotate(stripColors)

  if (annotation.length > 100) {
    // For rather large annotations - we include up to 5 errors up front, before printing the whole object.

    // Up to 5 `details`
    tokens.push(
      ...err.details.slice(0, 5).map(i => {
        return i.message
        // Currently not specifying the path, to not "overwhelm" the message
        // Can be reverted if needed.
        // let msg = i.message
        // const paths = i.path.filter(Boolean).join('.')
        // if (paths) msg += ` @ .${paths}`
        // return msg
      }),
    )

    if (err.details.length > 5) tokens.push(`... ${err.details.length} errors in total`)
    tokens.push('')
  }

  tokens.push(
    _truncateMiddle(annotation, 4000, `\n... ${_hb(annotation.length)} message truncated ...\n`),
  )

  const msg = tokens.join('\n')

  const data: JoiValidationErrorData = {
    joiValidationErrorItems: err.details,
    ...(objectName && { joiValidationObjectName: objectName }),
    ...(objectId && { joiValidationObjectId: objectId }),
  }

  // Make annotation non-enumerable, to not get it automatically printed,
  // but still accessible
  Object.defineProperty(data, 'annotation', {
    writable: true,
    configurable: true,
    enumerable: false,
    value: annotation,
  })

  return new JoiValidationError(msg, data)
}
