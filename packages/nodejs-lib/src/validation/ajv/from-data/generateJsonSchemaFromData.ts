import { _uniq } from '@naturalcycles/js-lib/array'
import { _stringMapEntries } from '@naturalcycles/js-lib/types'
import type { AnyObject, StringMap } from '@naturalcycles/js-lib/types'
import type { JsonSchema } from '../jsonSchemaBuilder.js'

type PrimitiveType = 'undefined' | 'null' | 'boolean' | 'string' | 'number'
type Type = PrimitiveType | 'array' | 'object'

/**
 * Each row must be an object (current limitation).
 *
 * `additionalProperties` is set to `true`, cause it's safer.
 */
export function generateJsonSchemaFromData<T extends AnyObject = AnyObject>(
  rows: AnyObject[],
): JsonSchema<T> {
  return objectToJsonSchema<T>(rows as any)
}

function objectToJsonSchema<T extends AnyObject>(rows: AnyObject[]): JsonSchema<T> {
  const typesByKey: StringMap<Set<Type>> = {}

  rows.forEach(r => {
    Object.keys(r).forEach(key => {
      typesByKey[key] ||= new Set<Type>()
      typesByKey[key].add(getTypeOfValue(r[key]))
    })
  })

  const s: JsonSchema<T> = {
    type: 'object',
    properties: {} as any,
    required: [],
    additionalProperties: true,
  }

  _stringMapEntries(typesByKey).forEach(([key, types]) => {
    const schema = mergeTypes(
      [...types],
      rows.map(r => r[key]),
    )
    if (!schema) return
    s.properties![key as keyof T] = schema as any
  })

  // console.log(typesByKey)

  return s
}

function mergeTypes(types: Type[], samples: any[]): JsonSchema | undefined {
  // skip "undefined" types
  types = types.filter(t => t !== 'undefined')

  if (!types.length) return undefined

  if (types.length > 1) {
    // oneOf
    const s: JsonSchema = {
      oneOf: types.map(type => mergeTypes([type], samples)!),
    }

    return s
  }

  const type = types[0]!

  if (type === 'null') {
    return {
      type: 'null',
    } as JsonSchema
  }

  if (type === 'boolean') {
    return {
      type: 'boolean',
    } as JsonSchema
  }

  if (type === 'string') {
    return {
      type: 'string',
    } as JsonSchema
  }

  if (type === 'number') {
    return {
      type: 'number',
    } as JsonSchema
  }

  if (type === 'object') {
    return objectToJsonSchema(samples.filter((r: any) => r && typeof r === 'object'))
  }

  if (type === 'array') {
    // possible feature: detect if it's a tuple
    // currently assume no-tuple
    const items = samples.filter(r => Array.isArray(r)).flat()
    const itemTypes = _uniq(items.map(i => getTypeOfValue(i)))

    return {
      type: 'array',
      items: mergeTypes(itemTypes, items),
    } as JsonSchema
  }
}

function getTypeOfValue(v: any): Type {
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  return typeof v as Type
}
