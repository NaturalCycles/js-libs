import { _uniq } from '@naturalcycles/js-lib/array'
import { _filterNullishValues } from '@naturalcycles/js-lib/object'
import type { AnyObject } from '@naturalcycles/js-lib/types'
import type { JsonSchema } from './ajvSchema.js'

export const JSON_SCHEMA_ORDER = [
  '$schema',
  '$id',
  'title',
  'description',
  'deprecated',
  'readOnly',
  'writeOnly',
  'type',
  'default',
  // Object,
  'properties',
  'required',
  'minProperties',
  'maxProperties',
  'patternProperties',
  'propertyNames',
  // Array
  'properties',
  'required',
  'minProperties',
  'maxProperties',
  'patternProperties',
  'propertyNames',
  // String
  'pattern',
  'minLength',
  'maxLength',
  'format',
  'transform',
  // Number
  'format',
  'multipleOf',
  'minimum',
  'exclusiveMinimum',
  'maximum',
  'exclusiveMaximum',
]

/**
 * Merges s2 into s1 (mutates s1) and returns s1.
 * Does not mutate s2.
 * API similar to Object.assign(s1, s2)
 */
export function mergeJsonSchemaObjects<T1 extends AnyObject, T2 extends AnyObject>(
  schema1: JsonSchema<T1>,
  schema2: JsonSchema<T2>,
): JsonSchema<T1 & T2> {
  const s1 = schema1 as any
  const s2 = schema2 as any

  // Merge `properties`
  Object.entries(s2.properties).forEach(([k, v]) => {
    s1.properties[k] = v
  })

  // Merge `patternProperties`
  Object.entries(s2.patternProperties || {}).forEach(([k, v]) => {
    s1.patternProperties[k] = v
  })

  s1.propertyNames = s2.propertyNames || s1.propertyNames
  s1.minProperties = s2.minProperties ?? s1.minProperties
  s1.maxProperties = s2.maxProperties ?? s1.maxProperties

  // Merge `required`
  s1.required.push(...s2.required)
  s1.required = _uniq(s1.required).sort()

  // `additionalProperties` remains the same

  return _filterNullishValues(s1, { mutate: true })
}

export function isEveryItemString(arr: any[]): boolean {
  for (const item of arr) {
    if (typeof item !== 'string') return false
  }
  return true
}

export function isEveryItemNumber(arr: any[]): boolean {
  for (const item of arr) {
    if (typeof item !== 'number') return false
  }
  return true
}

export function isEveryItemPrimitive(arr: any[]): boolean {
  for (const item of arr) {
    if (typeof item !== 'number' && typeof item !== 'string' && typeof item !== 'symbol') {
      return false
    }
  }
  return true
}
