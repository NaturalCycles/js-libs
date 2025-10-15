import { _uniq } from '../../array/index.js'
import { _stringMapEntries, type AnyObject, type StringMap } from '../../types.js'
import type {
  JsonSchema2,
  JsonSchemaArray,
  JsonSchemaBoolean,
  JsonSchemaNull,
  JsonSchemaNumber,
  JsonSchemaObject,
  JsonSchemaOneOf,
  JsonSchemaString,
} from '../index.js'

type PrimitiveType = 'undefined' | 'null' | 'boolean' | 'string' | 'number'
type Type = PrimitiveType | 'array' | 'object'

/**
 * Each row must be an object (current limitation).
 *
 * `additionalProperties` is set to `true`, cause it's safer.
 */
export function generateJsonSchemaFromData<T extends AnyObject = AnyObject>(
  rows: AnyObject[],
): JsonSchemaObject<T> {
  return objectToJsonSchema(rows as any) as JsonSchemaObject<T>
}

function objectToJsonSchema(rows: AnyObject[]): JsonSchemaObject {
  const typesByKey: StringMap<Set<Type>> = {}

  rows.forEach(r => {
    Object.keys(r).forEach(key => {
      typesByKey[key] ||= new Set<Type>()
      typesByKey[key].add(getTypeOfValue(r[key]))
    })
  })

  const s: JsonSchemaObject = {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: true,
  }

  _stringMapEntries(typesByKey).forEach(([key, types]) => {
    const schema = mergeTypes(
      [...types],
      rows.map(r => r[key]),
    )
    if (!schema) return
    s.properties[key] = schema
  })

  // console.log(typesByKey)

  return s
}

function mergeTypes(types: Type[], samples: any[]): JsonSchema2 | undefined {
  // skip "undefined" types
  types = types.filter(t => t !== 'undefined')

  if (!types.length) return undefined

  if (types.length > 1) {
    // oneOf
    const s: JsonSchemaOneOf = {
      oneOf: types.map(type => mergeTypes([type], samples)!),
    }

    return s
  }

  const type = types[0]!

  if (type === 'null') {
    return {
      type: 'null',
    } as JsonSchemaNull
  }

  if (type === 'boolean') {
    return {
      type: 'boolean',
    } as JsonSchemaBoolean
  }

  if (type === 'string') {
    return {
      type: 'string',
    } as JsonSchemaString
  }

  if (type === 'number') {
    return {
      type: 'number',
    } as JsonSchemaNumber
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
    } as JsonSchemaArray
  }
}

function getTypeOfValue(v: any): Type {
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  return typeof v as Type
}
