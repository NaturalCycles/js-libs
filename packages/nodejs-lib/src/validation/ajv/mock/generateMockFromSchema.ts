import { _clamp, _isPlainObject } from '@naturalcycles/js-lib'
import { localDate, localTime } from '@naturalcycles/js-lib/datetime'
import { _mapValues, Set2 } from '@naturalcycles/js-lib/object'
import type { AnyObject, IsoDate, StringMap, UnixTimestamp } from '@naturalcycles/js-lib/types'
import { _stringMapEntries } from '@naturalcycles/js-lib/types'
import type { JSchema, JsonSchema, JsonSchemaIsoDateOptions } from '../jSchema.js'

/**
 * Generates a value that passes the schema, e.g for a mock in a test.
 * Uses the example or default of a field when it has one.
 * A string with a pattern needs an example or a default.
 *
 * ```
 * const account = generateMockFromSchema(accountSchema, { allFields: true })
 * ```
 */
export function generateMockFromSchema<OUT>(
  schema: JSchema<OUT, any>,
  opt: GenerateMockFromSchemaOptions = {},
): OUT {
  const ctx: GenerationContext = {
    opt,
    choices: new Map(),
    reachedChoices: [],
    convertedPaths: new Set(),
  }
  const value = generateValue(schema.build(), '', ctx)
  return validateMock(schema, value, ctx.convertedPaths)
}

/**
 * Generates the mock of `generateMockFromSchema` with `allFields`, plus one variant for each other
 * branch of each `j.anyOfThese` and `j.anyOfBy` union, and for each other property of each group
 * of exclusive properties, so every field appears in some variant.
 * `j.anyOf` and `j.oneOf` always take their first branch, since their branches add no fields.
 * With `maxProperties`, only the first fields up to the limit appear,
 * e.g `b` never appears for `{ a?, b? }.maxProperties(1)`.
 *
 * ```
 * const variants = generateMockVariantsFromSchema(accountSchema)
 * // [{ value }, { value, choice: { path: 'address.taxId', option: 1, key: 'mx_rfc' } }]
 * ```
 */
export function generateMockVariantsFromSchema<OUT>(schema: JSchema<OUT, any>): MockVariant<OUT>[] {
  // Built once, so a choice is the same object in every run
  const root = schema.build()
  const queue: QueuedVariant[] = [{ choices: new Map() }]
  const seenChoices = new Set<ChoicePoint>()
  const variants: MockVariant<OUT>[] = []

  for (const { choices, choice } of queue) {
    const ctx: GenerationContext = {
      opt: { allFields: true },
      choices,
      reachedChoices: [],
      convertedPaths: new Set(),
    }
    const value = generateValue(root, '', ctx)
    variants.push({
      value: validateMock(schema, value, ctx.convertedPaths),
      ...(choice && { choice }),
    })

    for (const { point, path, options } of ctx.reachedChoices) {
      if (seenChoices.has(point)) continue
      seenChoices.add(point)
      for (let option = 1; option < options.length; option++) {
        const { key } = options[option]!
        queue.push({
          choices: new Map(choices).set(point, option),
          choice: { path, option, ...(key !== undefined && { key }) },
        })
      }
    }
  }

  return variants
}

/**
 * Validates the generated value, and throws when validation removed a part of it,
 * so a field never disappears from a mock without notice.
 * Values below a conversion are not compared, as a conversion may change their shape.
 */
function validateMock<OUT>(
  schema: JSchema<OUT, any>,
  value: unknown,
  convertedPaths: Set<string>,
): OUT {
  const generated = copyPlainValue(value)
  const validated = schema.validate(value)
  assertNothingRemoved(generated, validated, '', convertedPaths)
  return validated
}

function assertNothingRemoved(
  generated: unknown,
  validated: unknown,
  path: string,
  convertedPaths: Set<string>,
): void {
  if (convertedPaths.has(path)) return
  if (generated instanceof Set) {
    const validatedItems = validated instanceof Set ? Array.from(validated) : validated
    assertNothingRemoved(Array.from(generated), validatedItems, path, convertedPaths)
    return
  }
  if (Array.isArray(generated)) {
    for (const [index, item] of generated.entries()) {
      const validatedItem = (validated as unknown[] | undefined)?.[index]
      assertNothingRemoved(item, validatedItem, path, convertedPaths)
    }
    return
  }
  if (!_isPlainObject(generated)) return

  for (const [key, item] of Object.entries(generated)) {
    const itemPath = joinPath(path, key)
    const validatedItem = (validated as AnyObject | undefined)?.[key]
    if (validatedItem === undefined) {
      throw cannotGenerate(
        itemPath,
        'validation removed the generated value: an earlier `anyOfThese` branch matched without this field (put the wider branch first), or the schema does not allow the key, e.g a key from an example or one that fails the key schema',
      )
    }
    assertNothingRemoved(item, validatedItem, itemPath, convertedPaths)
  }
}

const MOCK_UNIX_TIMESTAMP = 1_655_287_200 as UnixTimestamp // 2022-06-15T10:00:00Z
const MOCK_ISO_DATE = '2022-06-15'

function generateValue(node: JsonSchema, path: string, ctx: GenerationContext): any {
  assertSupportedKeywords(node, path)
  if (node.customConversions?.length || node.postValidation) ctx.convertedPaths.add(path)
  const value = generateValueFromKeywords(node, path, ctx)
  if (node.optionalValues?.includes(value)) {
    throw cannotGenerate(
      path,
      `the generated value ${JSON.stringify(value)} would be removed by optionalValues, give the field an example`,
    )
  }
  return value
}

function generateValueFromKeywords(node: JsonSchema, path: string, ctx: GenerationContext): any {
  if (node.examples?.length) return copyPlainValue(node.examples[0])
  if (node.default !== undefined) return copyPlainValue(node.default)
  if (node.isUndefined) return undefined
  if (node.enum) return node.enum[0]
  if (node.ifDefined) return generateValue(node.ifDefined, path, ctx)

  if (node.anyOfThese || node.anyOfBy) return generateFieldUnion(node, path, ctx)
  const branches = [...(node.anyOf || []), ...(node.oneOf || [])]
  if (branches.length) {
    return generateValue(branches.find(isNonNullBranch) || branches[0]!, path, ctx)
  }

  if (node.instanceof === 'Date') return localTime.fromUnix(MOCK_UNIX_TIMESTAMP).toDate()
  if (node.instanceof) {
    throw cannotGenerate(path, `cannot create an instance of ${node.instanceof}`)
  }
  if (node.Buffer) return Buffer.from('mock')
  if (node.Set2) return new Set2(generateList(node, node.Set2, path, ctx))

  if (node.type === 'string') return generateString(node, path)
  if (node.type === 'number' || node.type === 'integer') return generateNumber(node, path)
  if (node.type === 'boolean') return true
  if (node.type === 'null') return null
  if (node.type === 'array') return generateArray(node, path, ctx)
  if (node.type === 'object') return generateObject(node, path, ctx)
  // A schema without a type, e.g `j.any()`, accepts any value
  return 'mock'
}

function assertSupportedKeywords(node: JsonSchema, path: string): void {
  for (const keyword of Object.keys(node)) {
    if (!SUPPORTED_KEYWORDS[keyword as keyof JsonSchema]) {
      throw cannotGenerate(path, `the keyword ${keyword} is not supported`)
    }
  }
}

/**
 * Copies plain objects, arrays and sets, so a variant does not share them with the schema
 * or with other variants.
 */
function copyPlainValue(value: any): any {
  if (Array.isArray(value)) return value.map(copyPlainValue)
  if (value instanceof Set2) return new Set2(Array.from(value, copyPlainValue))
  if (!_isPlainObject(value)) return value
  return _mapValues(value, (_, item) => copyPlainValue(item))
}

/**
 * Generates one branch of the union: the branch listed for it in `ctx.choices`, or else the first.
 */
function generateFieldUnion(node: JsonSchema, path: string, ctx: GenerationContext): any {
  const branches = getUnionBranches(node).filter(branch => isNonNullBranch(branch.schema))
  if (!branches.length) throw cannotGenerate(path, 'the union has no branch that is not null')
  ctx.reachedChoices.push({ point: node, path, options: branches })

  const { key, schema } = branches[ctx.choices.get(node) ?? 0]!
  const value = generateValue(schema, path, ctx)
  if (!node.anyOfBy) return value

  const { propertyName } = node.anyOfBy
  const properties: StringMap<JsonSchema> = schema.properties || {}
  return { ...value, [propertyName]: toPropertyValue(key!, properties[propertyName]) }
}

function getUnionBranches(node: JsonSchema): UnionBranch[] {
  if (node.anyOfBy) {
    return _stringMapEntries(node.anyOfBy.schemaDictionary).map(([key, schema]) => ({
      key,
      schema,
    }))
  }
  return (node.anyOfThese || []).map(schema => ({ schema }))
}

/**
 * Dictionary keys are strings, while the property can be e.g a number enum.
 */
function toPropertyValue(key: string, propertySchema: JsonSchema | undefined): unknown {
  const enumValue = propertySchema?.enum?.find((value: unknown) => String(value) === key)
  if (enumValue !== undefined) return enumValue
  if (propertySchema?.type === 'number' || propertySchema?.type === 'integer') return Number(key)
  if (propertySchema?.type === 'boolean') return key === 'true'
  return key
}

function isNonNullBranch(branch: JsonSchema): boolean {
  if (branch.type === 'null' || branch.isUndefined) return false
  // `j.literal(null)` builds `{ enum: [null] }`
  return !(branch.enum?.length === 1 && branch.enum[0] === null)
}

function generateString(node: JsonSchema, path: string): string {
  if (node.IsoDate) return generateIsoDate(node.IsoDate)
  if (node.IsoDateTime) return `${MOCK_ISO_DATE}T10:00:00Z`
  if (node.IsoMonth) return MOCK_ISO_DATE.slice(0, 7)
  if (node.UtcOffset) return '+02:00'
  if (node.email) return 'mock@example.com'
  if (node.pattern) {
    throw cannotGenerate(path, 'a string with a pattern needs an example, .example(...)')
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
    // One step inside a bound, e.g 3 for `exclusiveMin(2)`
    if (!step) return [candidate, candidate + 1, candidate - 1]
    const below = Math.floor(candidate / step) * step
    const above = Math.ceil(candidate / step) * step
    return [above, below, above + step, below - step]
  })

  const value = roundedCandidates.find(candidate => isWithinBounds(node, candidate, step))
  if (value === undefined) {
    throw cannotGenerate(path, 'no number satisfies the bounds of the schema')
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
  if (node.type === 'integer' && !Number.isInteger(value)) return false
  return true
}

function generateArray(node: JsonSchema, path: string, ctx: GenerationContext): any[] {
  if (node.prefixItems) {
    return node.prefixItems.map((item, index) => generateValue(item, `${path}[${index}]`, ctx))
  }
  if (!node.items) return []
  return generateList(node, node.items, path, ctx)
}

/**
 * `minItems` items, at least one with `allFields`, at most `maxItems`.
 */
function generateList(
  node: JsonSchema,
  itemSchema: JsonSchema,
  path: string,
  ctx: GenerationContext,
): any[] {
  const minCount = Math.max(node.minItems || 0, ctx.opt.allFields ? 1 : 0)
  const count = _clamp(minCount, 0, node.maxItems ?? minCount)

  if (count > 1 && (node.Set2 || node.uniqueItems)) {
    throw cannotGenerate(
      path,
      `a list of ${count} distinct items needs an example, .example([...])`,
    )
  }

  // The items share the path of the list: they come from the same schema
  return Array.from({ length: count }, () => generateValue(itemSchema, path, ctx))
}

function generateObject(node: JsonSchema, path: string, ctx: GenerationContext): AnyObject {
  const keys = selectPropertyKeys(node, path, ctx)
  const properties: StringMap<JsonSchema> = node.properties || {}
  const result: AnyObject = {}

  for (const key of keys) {
    const value = generateValue(properties[key]!, joinPath(path, key), ctx)
    if (value !== undefined) result[key] = value
  }

  const shouldFillMaps = ctx.opt.allFields || keys.length < (node.minProperties || 0)
  const hasRoomForMaps = keys.length < (node.maxProperties ?? Infinity)
  if (!shouldFillMaps || !hasRoomForMaps) return result

  const missingCount = (node.minProperties || 0) - keys.length
  if (missingCount > 1) {
    throw cannotGenerate(path, `a map of ${missingCount} keys needs an example, .example({...})`)
  }

  for (const [pattern, valueSchema] of _stringMapEntries(node.patternProperties || {})) {
    const key = generateKey(node, path, ctx)
    if (key === undefined) {
      throw cannotGenerate(
        path,
        `a map with keys matching ${pattern} needs an example, .example({...})`,
      )
    }
    assertKeyIsFree(node, result, key, path)
    result[key] = generateValue(valueSchema, joinPath(path, key), ctx)
  }
  if (typeof node.additionalProperties === 'object') {
    const key = generateKey(node, path, ctx) ?? findFreeKey(node, result)
    assertKeyIsFree(node, result, key, path)
    result[key] = generateValue(node.additionalProperties, joinPath(path, key), ctx)
  }

  return result
}

/**
 * `key`, or else `key1`, `key2` and so on, whichever the object does not have yet.
 */
function findFreeKey(node: JsonSchema, result: AnyObject): string {
  let key = 'key'
  for (let index = 1; isKeyTaken(node, result, key); index++) key = `key${index}`
  return key
}

function assertKeyIsFree(node: JsonSchema, result: AnyObject, key: string, path: string): void {
  if (isKeyTaken(node, result, key)) {
    throw cannotGenerate(
      joinPath(path, key),
      `the key schema gives the key ${JSON.stringify(key)}, which is also a field of the object: give the key schema another example, or the map an example, .example({...})`,
    )
  }
}

function isKeyTaken(node: JsonSchema, result: AnyObject, key: string): boolean {
  return Object.hasOwn(node.properties || {}, key) || Object.hasOwn(result, key)
}

/**
 * The required keys, or every key with `allFields`, plus optional keys until `minProperties`
 * is reached, and at most `maxProperties` keys. Only one key of each group of exclusive properties
 * is kept. The keys keep the order of the schema.
 */
function selectPropertyKeys(node: JsonSchema, path: string, ctx: GenerationContext): string[] {
  const required = node.required || []
  const excludedKeys = new Set(
    (node.exclusiveProperties || []).flatMap(group => {
      const keptKey = chooseExclusiveKey(group, required, path, ctx)
      return group.filter(key => key !== keptKey)
    }),
  )
  const candidateKeys = Object.keys(node.properties || {}).filter(key => !excludedKeys.has(key))
  const requiredKeys = candidateKeys.filter(key => required.includes(key))
  const optionalKeys = candidateKeys.filter(key => !required.includes(key))

  const minCount = ctx.opt.allFields
    ? candidateKeys.length
    : Math.max(requiredKeys.length, node.minProperties || 0)
  const count = _clamp(minCount, 0, node.maxProperties ?? minCount)

  const keptOptionalKeys = new Set(optionalKeys.slice(0, Math.max(0, count - requiredKeys.length)))
  return candidateKeys.filter(key => required.includes(key) || keptOptionalKeys.has(key))
}

/**
 * The required key of the group, or else the key listed for the group in `ctx.choices`,
 * or else the first.
 */
function chooseExclusiveKey(
  group: readonly string[],
  required: string[],
  path: string,
  ctx: GenerationContext,
): string {
  const requiredKey = group.find(key => required.includes(key))
  if (requiredKey) return requiredKey
  ctx.reachedChoices.push({ point: group, path, options: group.map(key => ({ key })) })
  return group[ctx.choices.get(group) ?? 0]!
}

function generateKey(node: JsonSchema, path: string, ctx: GenerationContext): string | undefined {
  if (!node.keySchema) return
  return String(generateValue(node.keySchema, joinPath(path, '<key>'), ctx))
}

function cannotGenerate(path: string, reason: string): Error {
  return new Error(`Cannot generate a value at ${path || '(root)'}: ${reason}`)
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

export interface MockVariant<OUT> {
  value: OUT
  /**
   * The choice this variant changes: a branch of a union, or a property of a group of exclusive
   * properties. Absent for the first variant.
   */
  choice?: {
    /**
     * Path of the union, or of the object with the group, e.g `address.taxId`, empty at the root.
     * Two unions can share a path when one is directly inside a branch of the other.
     */
    path: string
    /**
     * Index of the branch, counting only branches that are not `null`, or of the property in the group.
     */
    option: number
    /**
     * Key of the branch in a `j.anyOfBy` union, or the property of the group.
     */
    key?: string
  }
}

interface GenerationContext {
  opt: GenerateMockFromSchemaOptions
  /**
   * The option to take at a choice. Other choices take their first option.
   */
  choices: Map<ChoicePoint, number>
  /**
   * Filled while generating: the choices, in the order they are reached.
   */
  reachedChoices: ReachedChoice[]
  /**
   * Filled while generating: the paths of values that a conversion or `postValidation` may change.
   */
  convertedPaths: Set<string>
}

/**
 * A union, by its schema node, or a group of exclusive properties.
 */
type ChoicePoint = JsonSchema | readonly string[]

interface ReachedChoice {
  point: ChoicePoint
  path: string
  /**
   * For a union, the branches that are not `null`. For a group, its properties.
   */
  options: ChoiceOption[]
}

interface ChoiceOption {
  /**
   * Key of the branch in a `j.anyOfBy` union, or the property of a group of exclusive properties.
   */
  key?: string
}

interface UnionBranch extends ChoiceOption {
  schema: JsonSchema
}

interface QueuedVariant {
  choices: Map<ChoicePoint, number>
  choice?: MockVariant<unknown>['choice']
}
