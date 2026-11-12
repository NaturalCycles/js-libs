import { localDate, localTime } from '@naturalcycles/js-lib/datetime'
import { Set2 } from '@naturalcycles/js-lib/object'
import type { AnyObject, IsoDate, StringMap, UnixTimestamp } from '@naturalcycles/js-lib/types'
import { _stringMapEntries, _stringMapValues } from '@naturalcycles/js-lib/types'
import type { JSchema, JsonSchema, JsonSchemaIsoDateOptions } from '../jSchema.js'

/**
 * Generates a value that passes the schema, e.g for a mock in a test.
 * Uses the example or default of a field when it has one.
 * A string with a pattern needs an example or a default.
 */
export function generateMockFromSchema<OUT>(
  schema: JSchema<OUT, any>,
  opt: GenerateMockFromSchemaOptions = {},
): OUT {
  const value = generateValue(schema.build(), '', opt)
  return schema.validate(value)
}

const MOCK_UNIX_TIMESTAMP = 1_655_287_200 as UnixTimestamp // 2022-06-15T10:00:00Z
const MOCK_ISO_DATE = '2022-06-15'

function generateValue(node: JsonSchema, path: string, opt: GenerateMockFromSchemaOptions): any {
  assertSupportedKeywords(node, path)

  if (node.examples?.length) return node.examples[0]
  if (node.default !== undefined) return node.default
  if (node.isUndefined) return undefined
  if (node.enum) return node.enum[0]
  if (node.ifDefined) return generateValue(node.ifDefined, path, opt)

  const branches = getBranches(node)
  if (branches.length) return generateValue(pickBranch(branches), path, opt)

  if (node.instanceof === 'Date') return localTime.fromUnix(MOCK_UNIX_TIMESTAMP).toDate()
  if (node.instanceof) {
    throw new Error(`Cannot generate an instance of ${node.instanceof} at ${describePath(path)}`)
  }
  if (node.Buffer) return Buffer.from('mock')
  if (node.Set2) return new Set2(generateList(node, node.Set2, path, opt))

  if (node.type === 'string') return generateString(node, path)
  if (node.type === 'number' || node.type === 'integer') return generateNumber(node, path)
  if (node.type === 'boolean') return true
  if (node.type === 'null') return null
  if (node.type === 'array') return generateArray(node, path, opt)
  if (node.type === 'object') return generateObject(node, path, opt)
  // A schema without a type, e.g `j.any()`, accepts any value
  return 'mock'
}

function assertSupportedKeywords(node: JsonSchema, path: string): void {
  for (const keyword of Object.keys(node)) {
    if (!SUPPORTED_KEYWORDS[keyword as keyof JsonSchema]) {
      throw new Error(`Cannot generate a value for the keyword ${keyword} at ${describePath(path)}`)
    }
  }
}

function getBranches(node: JsonSchema): JsonSchema[] {
  return [
    ...(node.anyOf || []),
    ...(node.oneOf || []),
    ...(node.anyOfThese || []),
    ..._stringMapValues(node.anyOfBy?.schemaDictionary || {}),
  ]
}

function pickBranch(branches: JsonSchema[]): JsonSchema {
  return branches.find(branch => branch.type !== 'null' && !branch.isUndefined) || branches[0]!
}

function generateString(node: JsonSchema, path: string): string {
  if (node.IsoDate) return generateIsoDate(node.IsoDate)
  if (node.IsoDateTime) return `${MOCK_ISO_DATE}T10:00:00Z`
  if (node.IsoMonth) return MOCK_ISO_DATE.slice(0, 7)
  if (node.UtcOffset) return '+02:00'
  if (node.email) return 'mock@example.com'
  if (node.pattern) {
    throw new Error(
      `The string at ${describePath(path)} has a pattern and needs an example: .example(...)`,
    )
  }

  const value = 'mock'.padEnd(node.minLength || 0, 'x')
  return value.slice(0, node.maxLength ?? value.length)
}

/**
 * ISO dates sort as strings, so the bounds are compared as strings.
 */
function generateIsoDate(bounds: JsonSchemaIsoDateOptions): string {
  const { sameOrAfter, after, sameOrBefore, before } = bounds
  let date: string = MOCK_ISO_DATE
  if (sameOrAfter && date < sameOrAfter) date = sameOrAfter
  if (after && date <= after) {
    date = localDate(after as IsoDate)
      .plusDays(1)
      .toISODate()
  }
  if (sameOrBefore && date > sameOrBefore) date = sameOrBefore
  if (before && date >= before) {
    date = localDate(before as IsoDate)
      .minusDays(1)
      .toISODate()
  }
  return date
}

/**
 * Tries the preferred number, then numbers at and between the bounds, rounded to the step
 * (`multipleOf`, or 1 for an integer) in both directions.
 */
function generateNumber(node: JsonSchema, path: string): number {
  const step = node.multipleOf ?? (node.type === 'integer' ? 1 : undefined)
  const candidates = [
    getPreferredNumber(node),
    node.minimum,
    node.exclusiveMinimum,
    node.maximum,
    node.exclusiveMaximum,
    getMidpoint(node),
  ].filter(candidate => candidate !== undefined)

  const roundedCandidates = candidates.flatMap(candidate => {
    if (!step) return [candidate]
    const below = Math.floor(candidate / step) * step
    const above = Math.ceil(candidate / step) * step
    return [above, below, above + step, below - step]
  })

  const value = roundedCandidates.find(candidate => isWithinBounds(node, candidate, step))
  if (value === undefined) {
    throw new Error(`No number at ${describePath(path)} satisfies the bounds of the schema`)
  }
  // Turns -0 into 0
  return value + 0
}

function getPreferredNumber(node: JsonSchema): number {
  if (node.format === 'UnixTimestamp') return MOCK_UNIX_TIMESTAMP
  if (node.format === 'UnixTimestampMillis') return MOCK_UNIX_TIMESTAMP * 1000
  return 1
}

function getMidpoint(node: JsonSchema): number | undefined {
  const lower = node.minimum ?? node.exclusiveMinimum
  const upper = node.maximum ?? node.exclusiveMaximum
  if (lower === undefined || upper === undefined) return
  return lower + (upper - lower) / 2
}

function isWithinBounds(node: JsonSchema, value: number, step: number | undefined): boolean {
  if (node.minimum !== undefined && value < node.minimum) return false
  if (node.exclusiveMinimum !== undefined && value <= node.exclusiveMinimum) return false
  if (node.maximum !== undefined && value > node.maximum) return false
  if (node.exclusiveMaximum !== undefined && value >= node.exclusiveMaximum) return false
  if (step && !Number.isInteger(value / step)) return false
  return true
}

function generateArray(node: JsonSchema, path: string, opt: GenerateMockFromSchemaOptions): any[] {
  if (node.prefixItems) {
    return node.prefixItems.map((item, index) => generateValue(item, `${path}[${index}]`, opt))
  }
  if (!node.items) return []
  return generateList(node, node.items, path, opt)
}

/**
 * `minItems` items, at least one with `allFields`, at most `maxItems`.
 */
function generateList(
  node: JsonSchema,
  itemSchema: JsonSchema,
  path: string,
  opt: GenerateMockFromSchemaOptions,
): any[] {
  let count = node.minItems || 0
  if (opt.allFields) count = Math.max(count, 1)
  count = Math.min(count, node.maxItems ?? count)

  if (count > 1 && (node.Set2 || node.uniqueItems)) {
    throw new Error(
      `The list at ${describePath(path)} needs ${count} distinct items and needs an example: .example(...)`,
    )
  }

  return Array.from({ length: count }, (_, index) =>
    generateValue(itemSchema, `${path}[${index}]`, opt),
  )
}

function generateObject(
  node: JsonSchema,
  path: string,
  opt: GenerateMockFromSchemaOptions,
): AnyObject {
  const keys = selectPropertyKeys(node, opt)
  const properties: StringMap<JsonSchema> = node.properties || {}
  const result: AnyObject = {}

  for (const key of keys) {
    const value = generateValue(properties[key]!, joinPath(path, key), opt)
    if (value !== undefined) result[key] = value
  }

  const shouldFillMaps = opt.allFields || keys.length < (node.minProperties || 0)
  const hasRoomForMaps = keys.length < (node.maxProperties ?? Infinity)
  if (!shouldFillMaps || !hasRoomForMaps) return result

  for (const [pattern, valueSchema] of _stringMapEntries(node.patternProperties || {})) {
    const key = generateKey(node, path, opt)
    if (key === undefined) {
      throw new Error(
        `The map at ${describePath(path)} has keys with the pattern ${pattern} and needs an example: .example({...})`,
      )
    }
    result[key] = generateValue(valueSchema, joinPath(path, key), opt)
  }
  if (typeof node.additionalProperties === 'object') {
    const key = generateKey(node, path, opt) ?? 'key'
    result[key] = generateValue(node.additionalProperties, joinPath(path, key), opt)
  }

  return result
}

/**
 * The required keys, or every key with `allFields`, plus optional keys until `minProperties`
 * is reached, and at most `maxProperties` keys. From each group of exclusive properties,
 * only the required key, or else the first key, is kept. The keys keep the order of the schema.
 */
function selectPropertyKeys(node: JsonSchema, opt: GenerateMockFromSchemaOptions): string[] {
  const required = node.required || []
  const excludedKeys = new Set(
    (node.exclusiveProperties || []).flatMap(group => {
      const keptKey = group.find(key => required.includes(key)) ?? group[0]
      return group.filter(key => key !== keptKey)
    }),
  )
  const candidateKeys = Object.keys(node.properties || {}).filter(key => !excludedKeys.has(key))
  const requiredKeys = candidateKeys.filter(key => required.includes(key))
  const optionalKeys = candidateKeys.filter(key => !required.includes(key))

  let count = Math.max(requiredKeys.length, node.minProperties || 0)
  if (opt.allFields) count = candidateKeys.length
  count = Math.min(count, node.maxProperties ?? count)

  const selectedKeys = new Set([...requiredKeys, ...optionalKeys].slice(0, count))
  return candidateKeys.filter(key => selectedKeys.has(key))
}

function generateKey(
  node: JsonSchema,
  path: string,
  opt: GenerateMockFromSchemaOptions,
): string | undefined {
  if (!node.keySchema) return
  return String(generateValue(node.keySchema, joinPath(path, '<key>'), opt))
}

function describePath(path: string): string {
  return path || '(root)'
}

function joinPath(path: string, segment: string): string {
  if (!path) return segment
  return `${path}.${segment}`
}

/**
 * Whether the generator supports each keyword. A schema with an unsupported or unknown keyword
 * throws, so the generator does not silently produce a wrong value.
 */
const SUPPORTED_KEYWORDS: Record<keyof JsonSchema, boolean> = {
  // Values
  type: true,
  default: true,
  examples: true,
  enum: true,
  // Unions
  anyOf: true,
  oneOf: true,
  anyOfThese: true,
  anyOfBy: true,
  ifDefined: true,
  isUndefined: true,
  // Strings
  pattern: true,
  minLength: true,
  maxLength: true,
  format: true,
  email: true,
  IsoDate: true,
  IsoDateTime: true,
  IsoMonth: true,
  UtcOffset: true,
  // Numbers
  minimum: true,
  exclusiveMinimum: true,
  maximum: true,
  exclusiveMaximum: true,
  multipleOf: true,
  precision: true,
  // Arrays and sets
  items: true,
  prefixItems: true,
  minItems: true,
  maxItems: true,
  uniqueItems: true,
  Set2: true,
  // Objects
  properties: true,
  required: true,
  patternProperties: true,
  additionalProperties: true,
  keySchema: true,
  minProperties: true,
  minProperties2: true,
  maxProperties: true,
  exclusiveProperties: true,
  instanceof: true,
  Buffer: true,
  // Annotations, and rules that the validation at the end checks
  $schema: true,
  $id: true,
  title: true,
  description: true,
  deprecated: true,
  readOnly: true,
  writeOnly: true,
  hasIsOfTypeCheck: true,
  errorMessages: true,
  enumNames: true,
  enumKeys: true,
  transform: true,
  optionalValues: true,
  customValidations: true,
  customConversions: true,
  postValidation: true,
  // Not built by `j`
  if: false,
  // oxlint-disable-next-line unicorn/no-thenable -- a JSON Schema keyword, the object is never awaited
  then: false,
  else: false,
  contentMediaType: false,
  contentEncoding: false,
  // Type-only and parser-only fields, never in a built schema
  out: false,
  optionalField: false,
}

export interface GenerateMockFromSchemaOptions {
  /**
   * Fills every optional field, and puts one item in each list and one key in each map.
   * Default: false, only the required fields.
   */
  allFields?: boolean
}
