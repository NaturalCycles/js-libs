/* eslint-disable id-denylist */
// oxlint-disable max-lines
// biome-ignore lint/suspicious/noShadowRestrictedNames: needed for decorator signature
// biome-ignore-all: this file intentionally violates some lint rules for decorators

import {
  _isUndefined,
  _numberEnumValues,
  _stringEnumValues,
  getEnumType,
} from '@naturalcycles/js-lib'
import { _uniq } from '@naturalcycles/js-lib/array'
import { _assert } from '@naturalcycles/js-lib/error'
import type { Set2 } from '@naturalcycles/js-lib/object'
import { _deepCopy, _sortObject } from '@naturalcycles/js-lib/object'
import { _stringify } from '@naturalcycles/js-lib/string'
import {
  _objectAssign,
  type AnyObject,
  type BaseDBEntity,
  type IANATimezone,
  type Inclusiveness,
  type IsoDate,
  type IsoDateTime,
  JWT_REGEX,
  type NumberEnum,
  type StringEnum,
  type StringMap,
  type UnixTimestamp,
  type UnixTimestampMillis,
} from '@naturalcycles/js-lib/types'
import {
  BASE64URL_REGEX,
  COUNTRY_CODE_REGEX,
  CURRENCY_REGEX,
  IPV4_REGEX,
  IPV6_REGEX,
  LANGUAGE_TAG_REGEX,
  SEMVER_REGEX,
  SLUG_REGEX,
  UUID_REGEX,
} from '../regexes.js'
import { TIMEZONES } from '../timezones.js'
import {
  isEveryItemNumber,
  isEveryItemPrimitive,
  isEveryItemString,
  JSON_SCHEMA_ORDER,
  mergeJsonSchemaObjects,
} from './jsonSchemaBuilder.util.js'

export const j = {
  string(): JsonSchemaStringBuilder<string, string, false> {
    return new JsonSchemaStringBuilder()
  },

  number(): JsonSchemaNumberBuilder<number, number, false> {
    return new JsonSchemaNumberBuilder()
  },

  boolean(): JsonSchemaBooleanBuilder<boolean, boolean, false> {
    return new JsonSchemaBooleanBuilder()
  },

  object: Object.assign(object, {
    dbEntity: objectDbEntity,
    infer: objectInfer,
    any() {
      return j.object<AnyObject>({}).allowAdditionalProperties()
    },

    stringMap<S extends JsonSchemaTerminal<any, any, any>>(
      schema: S,
    ): JsonSchemaObjectBuilder<StringMap<SchemaIn<S>>, StringMap<SchemaOut<S>>> {
      const builtSchema = schema.build()

      return new JsonSchemaObjectBuilder<StringMap<SchemaIn<S>>, StringMap<SchemaOut<S>>>(
        {},
        {
          hasIsOfTypeCheck: false,
          patternProperties: {
            '^.+$': builtSchema,
          },
        },
      )
    },

    /**
     * @experimental Look around, maybe you find a rule that is better for your use-case.
     *
     * For Record<K, V> type of validations.
     * ```ts
     * const schema = j.object
     *  .record(
     *    j
     *      .string()
     *      .regex(/^\d{3,4}$/)
     *      .branded<B>(),
     *    j.number().nullable(),
     *  )
     *  .isOfType<Record<B, number | null>>()
     * ```
     *
     * When the keys of the Record are values from an Enum, prefer `j.object.withEnumKeys`!
     *
     * Non-matching keys will be stripped from the object, i.e. they will not cause an error.
     *
     * Caveat: This rule first validates values of every properties of the object, and only then validates the keys.
     * A consequence of that is that the validation will throw when there is an unexpected property with a value not matching the value schema.
     */
    record,

    /**
     * For Record<ENUM, V> type of validations.
     *
     * When the keys of the Record are values from an Enum,
     * this helper is more performant and behaves in a more conventional manner than `j.object.record` would.
     *
     *
     */
    withEnumKeys,
    withRegexKeys,
  }),

  array<IN, OUT, Opt>(
    itemSchema: JsonSchemaAnyBuilder<IN, OUT, Opt>,
  ): JsonSchemaArrayBuilder<IN, OUT, Opt> {
    return new JsonSchemaArrayBuilder(itemSchema)
  },

  set<IN, OUT, Opt>(
    itemSchema: JsonSchemaAnyBuilder<IN, OUT, Opt>,
  ): JsonSchemaSet2Builder<IN, OUT, Opt> {
    return new JsonSchemaSet2Builder(itemSchema)
  },

  buffer(): JsonSchemaBufferBuilder {
    return new JsonSchemaBufferBuilder()
  },

  enum<const T extends readonly (string | number | boolean | null)[] | StringEnum | NumberEnum>(
    input: T,
    opt?: JsonBuilderRuleOpt,
  ): JsonSchemaEnumBuilder<
    T extends readonly (infer U)[]
      ? U
      : T extends StringEnum
        ? T[keyof T]
        : T extends NumberEnum
          ? T[keyof T]
          : never
  > {
    let enumValues: readonly (string | number | boolean | null)[] | undefined
    let baseType: EnumBaseType = 'other'

    if (Array.isArray(input)) {
      enumValues = input
      if (isEveryItemNumber(input)) {
        baseType = 'number'
      } else if (isEveryItemString(input)) {
        baseType = 'string'
      }
    } else if (typeof input === 'object') {
      const enumType = getEnumType(input)
      if (enumType === 'NumberEnum') {
        enumValues = _numberEnumValues(input as NumberEnum)
        baseType = 'number'
      } else if (enumType === 'StringEnum') {
        enumValues = _stringEnumValues(input as StringEnum)
        baseType = 'string'
      }
    }

    _assert(enumValues, 'Unsupported enum input')
    return new JsonSchemaEnumBuilder(enumValues as any, baseType, opt)
  },

  oneOf<
    B extends readonly JsonSchemaAnyBuilder<any, any, boolean>[],
    IN = BuilderInUnion<B>,
    OUT = BuilderOutUnion<B>,
  >(items: [...B]): JsonSchemaAnyBuilder<IN, OUT, false> {
    const schemas = items.map(b => b.build())
    return new JsonSchemaAnyBuilder<IN, OUT, false>({
      oneOf: schemas,
    })
  },

  and() {
    return {
      silentBob: () => {
        throw new Error('...strike back!')
      },
    }
  },
}

const TS_2500 = 16725225600 // 2500-01-01
const TS_2500_MILLIS = TS_2500 * 1000
const TS_2000 = 946684800 // 2000-01-01
const TS_2000_MILLIS = TS_2000 * 1000

/*
  Notes for future reference

  Q: Why do we need `Opt` - when `IN` and `OUT` already carries the `| undefined`?
  A: Because of objects. Without `Opt`, an optional field would be inferred as `{ foo: string | undefined }`,
     which means that the `foo` property would be mandatory, it's just that its value can be `undefined` as well.
     With `Opt`, we can infer it as `{ foo?: string | undefined }`.
*/

@immutable
export class JsonSchemaTerminal<IN, OUT, Opt> {
  protected schema: JsonSchema

  constructor(schema: JsonSchema) {
    this.schema = schema
  }

  getSchema(): JsonSchema {
    return this.schema
  }

  /**
   * Produces a "clean schema object" without methods.
   * Same as if it would be JSON.stringified.
   */
  build(): JsonSchema<IN, OUT> {
    const jsonSchema = _sortObject(
      JSON.parse(JSON.stringify(this.schema)),
      JSON_SCHEMA_ORDER,
    ) as JsonSchema<IN, OUT>

    delete jsonSchema.optionalField

    return jsonSchema
  }

  clone(): this {
    // const schema = _deepCopy(this.schema)
    // const clone = new (this.constructor as { new (schema: JsonSchema): any })(schema)
    // return clone as this

    const clone = Object.create(Object.getPrototypeOf(this))
    clone.schema = _deepCopy(this.schema)
    return clone
  }

  /**
   * @experimental
   */
  in!: IN
  out!: OUT
  opt!: Opt
}

@immutable
export class JsonSchemaAnyBuilder<IN, OUT, Opt> extends JsonSchemaTerminal<IN, OUT, Opt> {
  protected setErrorMessage(ruleName: string, errorMessage: string | undefined): void {
    if (_isUndefined(errorMessage)) return

    this.schema.errorMessages ||= {}
    this.schema.errorMessages[ruleName] = errorMessage
  }

  /**
   * A helper function that takes a type parameter and compares it with the type inferred from the schema.
   *
   * When the type inferred from the schema differs from the passed-in type,
   * the schema becomes unusable, by turning its type into `never`.
   *
   * ```ts
   * const schemaGood = j.string().isOfType<string>() // ✅
   *
   * const schemaBad = j.string().isOfType<number>() // ❌
   * schemaBad.build() // TypeError: property "build" does not exist on type "never"
   *
   * const result = ajvValidateRequest.body(req, schemaBad) // result will have `unknown` type
   * ```
   */
  isOfType<ExpectedType>(): ExactMatch<ExpectedType, OUT> extends true ? this : never {
    _objectAssign(this.schema, { hasIsOfTypeCheck: true })
    return this as any
  }

  $schema($schema: string): this {
    _objectAssign(this.schema, { $schema })
    return this
  }

  $schemaDraft7(): this {
    this.$schema('http://json-schema.org/draft-07/schema#')
    return this
  }

  $id($id: string): this {
    _objectAssign(this.schema, { $id })
    return this
  }

  title(title: string): this {
    _objectAssign(this.schema, { title })
    return this
  }

  description(description: string): this {
    _objectAssign(this.schema, { description })
    return this
  }

  deprecated(deprecated = true): this {
    _objectAssign(this.schema, { deprecated })
    return this
  }

  type(type: string): this {
    _objectAssign(this.schema, { type })
    return this
  }

  default(v: any): this {
    _objectAssign(this.schema, { default: v })
    return this
  }

  instanceof(of: string): this {
    _objectAssign(this.schema, { type: 'object', instanceof: of })
    return this
  }

  optional(): JsonSchemaAnyBuilder<IN | undefined, OUT | undefined, true> {
    this.schema.optionalField = true
    return this as unknown as JsonSchemaAnyBuilder<IN | undefined, OUT | undefined, true>
  }

  nullable(): JsonSchemaAnyBuilder<IN | null, OUT | null, Opt> {
    return new JsonSchemaAnyBuilder({
      anyOf: [this.build(), { type: 'null' }],
    })
  }

  /**
   * @deprecated
   * The usage of this function is discouraged as it defeats the purpose of having type-safe validation.
   */
  castAs<T>(): JsonSchemaAnyBuilder<T, T, Opt> {
    return this as unknown as JsonSchemaAnyBuilder<T, T, Opt>
  }

  /**
   * Locks the given schema chain and no other modification can be done to it.
   */
  final(): JsonSchemaTerminal<IN, OUT, Opt> {
    return new JsonSchemaTerminal<IN, OUT, Opt>(this.schema)
  }
}

@immutable
export class JsonSchemaStringBuilder<
  IN extends string | undefined = string,
  OUT = IN,
  Opt extends boolean = false,
> extends JsonSchemaAnyBuilder<IN, OUT, Opt> {
  constructor() {
    super({
      type: 'string',
    })
  }

  /**
   * @param optionalValues List of values that should be considered/converted as `undefined`.
   *
   * This `optionalValues` feature only works when the current schema is nested in an object or array schema,
   * due to how mutability works in Ajv.
   */
  override optional(
    optionalValues?: string[],
  ): JsonSchemaStringBuilder<IN | undefined, OUT | undefined, true> {
    if (!optionalValues) {
      return super.optional() as unknown as JsonSchemaStringBuilder<
        IN | undefined,
        OUT | undefined,
        true
      >
    }

    const newBuilder = new JsonSchemaStringBuilder<IN, OUT, Opt>().optional()
    const alternativesSchema = j.enum(optionalValues)
    Object.assign(newBuilder.getSchema(), {
      anyOf: [this.build(), alternativesSchema.build()],
      optionalValues,
    })

    return newBuilder
  }

  regex(pattern: RegExp, opt?: JsonBuilderRuleOpt): this {
    return this.pattern(pattern.source, opt)
  }

  pattern(pattern: string, opt?: JsonBuilderRuleOpt): this {
    if (opt?.name) this.setErrorMessage('pattern', `is not a valid ${opt.name}`)
    if (opt?.msg) this.setErrorMessage('pattern', opt.msg)
    _objectAssign(this.schema, { pattern })
    return this
  }

  minLength(minLength: number): this {
    _objectAssign(this.schema, { minLength })
    return this
  }

  maxLength(maxLength: number): this {
    _objectAssign(this.schema, { maxLength })
    return this
  }

  length(exactLength: number): this
  length(minLength: number, maxLength: number): this
  length(minLengthOrExactLength: number, maxLength?: number): this {
    const maxLengthActual = maxLength ?? minLengthOrExactLength
    return this.minLength(minLengthOrExactLength).maxLength(maxLengthActual)
  }

  email(opt?: Partial<JsonSchemaStringEmailOptions>): this {
    const defaultOptions: JsonSchemaStringEmailOptions = { checkTLD: true }
    _objectAssign(this.schema, { email: { ...defaultOptions, ...opt } })
    return this.trim().toLowerCase()
  }

  trim(): this {
    _objectAssign(this.schema, { transform: { ...this.schema.transform, trim: true } })
    return this
  }

  toLowerCase(): this {
    _objectAssign(this.schema, { transform: { ...this.schema.transform, toLowerCase: true } })
    return this
  }

  toUpperCase(): this {
    _objectAssign(this.schema, { transform: { ...this.schema.transform, toUpperCase: true } })
    return this
  }

  truncate(toLength: number): this {
    _objectAssign(this.schema, { transform: { ...this.schema.transform, truncate: toLength } })
    return this
  }

  branded<B extends string>(): JsonSchemaStringBuilder<B, B, Opt> {
    return this as unknown as JsonSchemaStringBuilder<B, B, Opt>
  }

  /**
   * Validates that the input is a fully-specified YYYY-MM-DD formatted valid IsoDate value.
   *
   * All previous expectations in the schema chain are dropped - including `.optional()` -
   * because this call effectively starts a new schema chain.
   */
  isoDate(): JsonSchemaIsoDateBuilder {
    _objectAssign(this.schema, { IsoDate: {} })
    return new JsonSchemaIsoDateBuilder()
  }

  isoDateTime(): JsonSchemaStringBuilder<IsoDateTime | IN, IsoDateTime, Opt> {
    _objectAssign(this.schema, { IsoDateTime: true })
    return this.branded<IsoDateTime>()
  }

  /**
   * Validates the string format to be JWT.
   * Expects the JWT to be signed!
   */
  jwt(): this {
    return this.regex(JWT_REGEX, { msg: 'is not a valid JWT format' })
  }

  url(): this {
    // from `ajv-formats`
    const regex =
      /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00A1}-\u{FFFF}]+-)*[a-z0-9\u{00A1}-\u{FFFF}]+)(?:\.(?:[a-z0-9\u{00A1}-\u{FFFF}]+-)*[a-z0-9\u{00A1}-\u{FFFF}]+)*(?:\.(?:[a-z\u{00A1}-\u{FFFF}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu
    return this.regex(regex, { msg: 'is not a valid URL format' })
  }

  ipv4(): this {
    return this.regex(IPV4_REGEX, { msg: 'is not a valid IPv4 format' })
  }

  ipv6(): this {
    return this.regex(IPV6_REGEX, { msg: 'is not a valid IPv6 format' })
  }

  slug(): this {
    return this.regex(SLUG_REGEX, { msg: 'is not a valid slug format' })
  }

  semVer(): this {
    return this.regex(SEMVER_REGEX, { msg: 'is not a valid semver format' })
  }

  languageTag(): this {
    return this.regex(LANGUAGE_TAG_REGEX, { msg: 'is not a valid language format' })
  }

  countryCode(): this {
    return this.regex(COUNTRY_CODE_REGEX, { msg: 'is not a valid country code format' })
  }

  currency(): this {
    return this.regex(CURRENCY_REGEX, { msg: 'is not a valid currency format' })
  }

  /**
   * Validates that the input is a valid IANATimzone value.
   *
   * All previous expectations in the schema chain are dropped - including `.optional()` -
   * because this call effectively starts a new schema chain as an `enum` validation.
   */
  ianaTimezone(): JsonSchemaEnumBuilder<string | IANATimezone, IANATimezone, false> {
    // UTC is added to assist unit-testing, which uses UTC by default (not technically a valid Iana timezone identifier)
    return j.enum(TIMEZONES, { msg: 'is an invalid IANA timezone' }).branded<IANATimezone>()
  }

  base64Url(): this {
    return this.regex(BASE64URL_REGEX, {
      msg: 'contains characters not allowed in Base64 URL characterset',
    })
  }

  uuid(): this {
    return this.regex(UUID_REGEX, { msg: 'is an invalid UUID' })
  }
}

export interface JsonSchemaStringEmailOptions {
  checkTLD: boolean
}

@immutable
export class JsonSchemaIsoDateBuilder<Opt extends boolean = false> extends JsonSchemaAnyBuilder<
  string | IsoDate,
  IsoDate,
  Opt
> {
  constructor() {
    super({
      type: 'string',
      IsoDate: {},
    })
  }

  before(date: string): this {
    _objectAssign(this.schema.IsoDate!, { before: date })
    return this
  }

  sameOrBefore(date: string): this {
    _objectAssign(this.schema.IsoDate!, { sameOrBefore: date })
    return this
  }

  after(date: string): this {
    _objectAssign(this.schema.IsoDate!, { after: date })
    return this
  }

  sameOrAfter(date: string): this {
    _objectAssign(this.schema.IsoDate!, { sameOrAfter: date })
    return this
  }

  between(fromDate: string, toDate: string, incl: Inclusiveness): this {
    if (incl === '[)') {
      _objectAssign(this.schema.IsoDate!, { sameOrAfter: fromDate, before: toDate })
    } else if (incl === '[]') {
      _objectAssign(this.schema.IsoDate!, { sameOrAfter: fromDate, sameOrBefore: toDate })
    }

    return this
  }
}

export interface JsonSchemaIsoDateOptions {
  before?: string
  sameOrBefore?: string
  after?: string
  sameOrAfter?: string
}

@immutable
export class JsonSchemaNumberBuilder<
  IN extends number | undefined = number,
  OUT = IN,
  Opt extends boolean = false,
> extends JsonSchemaAnyBuilder<IN, OUT, Opt> {
  constructor() {
    super({
      type: 'number',
    })
  }

  /**
   * @param optionalValues List of values that should be considered/converted as `undefined`.
   *
   * This `optionalValues` feature only works when the current schema is nested in an object or array schema,
   * due to how mutability works in Ajv.
   */
  override optional(
    optionalValues?: number[],
  ): JsonSchemaNumberBuilder<IN | undefined, OUT | undefined, true> {
    if (!optionalValues) {
      return super.optional() as unknown as JsonSchemaNumberBuilder<
        IN | undefined,
        OUT | undefined,
        true
      >
    }

    const newBuilder = new JsonSchemaNumberBuilder<IN, OUT, Opt>().optional()
    const alternativesSchema = j.enum(optionalValues)
    Object.assign(newBuilder.getSchema(), {
      anyOf: [this.build(), alternativesSchema.build()],
      optionalValues,
    })

    return newBuilder
  }

  integer(): this {
    _objectAssign(this.schema, { type: 'integer' })
    return this
  }

  branded<B extends number>(): JsonSchemaNumberBuilder<B, B, Opt> {
    return this as unknown as JsonSchemaNumberBuilder<B, B, Opt>
  }

  multipleOf(multipleOf: number): this {
    _objectAssign(this.schema, { multipleOf })
    return this
  }

  min(minimum: number): this {
    _objectAssign(this.schema, { minimum })
    return this
  }

  exclusiveMin(exclusiveMinimum: number): this {
    _objectAssign(this.schema, { exclusiveMinimum })
    return this
  }

  max(maximum: number): this {
    _objectAssign(this.schema, { maximum })
    return this
  }

  exclusiveMax(exclusiveMaximum: number): this {
    _objectAssign(this.schema, { exclusiveMaximum })
    return this
  }

  lessThan(value: number): this {
    return this.exclusiveMax(value)
  }

  lessThanOrEqual(value: number): this {
    return this.max(value)
  }

  moreThan(value: number): this {
    return this.exclusiveMin(value)
  }

  moreThanOrEqual(value: number): this {
    return this.min(value)
  }

  equal(value: number): this {
    return this.min(value).max(value)
  }

  range(minimum: number, maximum: number, incl: Inclusiveness): this {
    if (incl === '[)') {
      return this.moreThanOrEqual(minimum).lessThan(maximum)
    }
    return this.moreThanOrEqual(minimum).lessThanOrEqual(maximum)
  }

  int32(): this {
    const MIN_INT32 = -(2 ** 31)
    const MAX_INT32 = 2 ** 31 - 1
    const currentMin = this.schema.minimum ?? Number.MIN_SAFE_INTEGER
    const currentMax = this.schema.maximum ?? Number.MAX_SAFE_INTEGER
    const newMin = Math.max(MIN_INT32, currentMin)
    const newMax = Math.min(MAX_INT32, currentMax)
    return this.integer().min(newMin).max(newMax)
  }

  int64(): this {
    const currentMin = this.schema.minimum ?? Number.MIN_SAFE_INTEGER
    const currentMax = this.schema.maximum ?? Number.MAX_SAFE_INTEGER
    const newMin = Math.max(Number.MIN_SAFE_INTEGER, currentMin)
    const newMax = Math.min(Number.MAX_SAFE_INTEGER, currentMax)
    return this.integer().min(newMin).max(newMax)
  }

  float(): this {
    return this
  }

  double(): this {
    return this
  }

  unixTimestamp(): JsonSchemaNumberBuilder<UnixTimestamp, UnixTimestamp, Opt> {
    return this.integer().min(0).max(TS_2500).branded<UnixTimestamp>()
  }

  unixTimestamp2000(): JsonSchemaNumberBuilder<UnixTimestamp, UnixTimestamp, Opt> {
    return this.integer().min(TS_2000).max(TS_2500).branded<UnixTimestamp>()
  }

  unixTimestampMillis(): JsonSchemaNumberBuilder<UnixTimestampMillis, UnixTimestampMillis, Opt> {
    return this.integer().min(0).max(TS_2500_MILLIS).branded<UnixTimestampMillis>()
  }

  unixTimestamp2000Millis(): JsonSchemaNumberBuilder<
    UnixTimestampMillis,
    UnixTimestampMillis,
    Opt
  > {
    return this.integer().min(TS_2000_MILLIS).max(TS_2500_MILLIS).branded<UnixTimestampMillis>()
  }

  utcOffset(): this {
    return this.integer()
      .multipleOf(15)
      .min(-12 * 60)
      .max(14 * 60)
  }

  utcOffsetHour(): this {
    return this.integer().min(-12).max(14)
  }
}

@immutable
export class JsonSchemaBooleanBuilder<
  IN extends boolean | undefined = boolean,
  OUT = IN,
  Opt extends boolean = false,
> extends JsonSchemaAnyBuilder<IN, OUT, Opt> {
  constructor() {
    super({
      type: 'boolean',
    })
  }

  /**
   * @param optionalValue One of the two possible boolean values that should be considered/converted as `undefined`.
   *
   * This `optionalValue` feature only works when the current schema is nested in an object or array schema,
   * due to how mutability works in Ajv.
   */
  override optional(
    optionalValue?: boolean,
  ): JsonSchemaBooleanBuilder<IN | undefined, OUT | undefined, true> {
    if (typeof optionalValue === 'undefined') {
      return super.optional() as unknown as JsonSchemaBooleanBuilder<
        IN | undefined,
        OUT | undefined,
        true
      >
    }

    const newBuilder = new JsonSchemaBooleanBuilder<IN, OUT, Opt>().optional()
    const alternativesSchema = j.enum([optionalValue])
    Object.assign(newBuilder.getSchema(), {
      anyOf: [this.build(), alternativesSchema.build()],
      optionalValues: [optionalValue],
    })

    return newBuilder
  }
}

@immutable
export class JsonSchemaObjectBuilder<
  IN extends AnyObject,
  OUT extends AnyObject,
  Opt extends boolean = false,
> extends JsonSchemaAnyBuilder<IN, OUT, Opt> {
  constructor(props?: AnyObject, opt?: JsonSchemaObjectBuilderOpts) {
    super({
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
      hasIsOfTypeCheck: opt?.hasIsOfTypeCheck ?? true,
      patternProperties: opt?.patternProperties ?? undefined,
      keySchema: opt?.keySchema ?? undefined,
    })

    if (props) this.addProperties(props)
  }

  addProperties(props: AnyObject): this {
    const properties: Record<string, JsonSchema> = {}
    const required: string[] = []

    for (const [key, builder] of Object.entries(props)) {
      const isOptional = (builder as JsonSchemaTerminal<any, any, any>).getSchema().optionalField
      if (!isOptional) {
        required.push(key)
      }

      const schema = builder.build()
      properties[key] = schema
    }

    this.schema.properties = properties
    this.schema.required = _uniq(required).sort()

    return this
  }

  /**
   * When set, the validation will not strip away properties that are not specified explicitly in the schema.
   */
  allowAdditionalProperties(): this {
    _objectAssign(this.schema, { additionalProperties: true })
    return this
  }

  extend<IN2 extends AnyObject>(
    props: AnyObject,
  ): JsonSchemaObjectBuilder<IN & IN2, OUT & IN2, Opt> {
    const newBuilder = new JsonSchemaObjectBuilder<IN & IN2, OUT & IN2, Opt>()
    _objectAssign(newBuilder.schema, _deepCopy(this.schema))

    const incomingSchemaBuilder = new JsonSchemaObjectBuilder<IN2, IN2, false>(props)
    mergeJsonSchemaObjects(newBuilder.schema as any, incomingSchemaBuilder.schema as any)

    return newBuilder
  }

  /**
   * Extends the current schema with `id`, `created` and `updated` according to NC DB conventions.
   */
  // oxlint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
  dbEntity() {
    return this.extend({
      id: j.string(),
      created: j.number().unixTimestamp2000(),
      updated: j.number().unixTimestamp2000(),
    })
  }

  minProperties(minProperties: number): this {
    Object.assign(this.schema, { minProperties })
    return this
  }

  maxProperties(maxProperties: number): this {
    Object.assign(this.schema, { maxProperties })
    return this
  }
}

interface JsonSchemaObjectBuilderOpts {
  hasIsOfTypeCheck?: false
  patternProperties?: StringMap<JsonSchema<any, any>>
  keySchema?: JsonSchema
}

@immutable
export class JsonSchemaObjectInferringBuilder<
  PROPS extends Record<string, JsonSchemaAnyBuilder<any, any, any>>,
  Opt extends boolean = false,
> extends JsonSchemaAnyBuilder<
  Expand<
    {
      [K in keyof PROPS as PROPS[K] extends JsonSchemaAnyBuilder<any, any, infer IsOpt>
        ? IsOpt extends true
          ? never
          : K
        : never]: PROPS[K] extends JsonSchemaAnyBuilder<infer IN, any, any> ? IN : never
    } & {
      [K in keyof PROPS as PROPS[K] extends JsonSchemaAnyBuilder<any, any, infer IsOpt>
        ? IsOpt extends true
          ? K
          : never
        : never]?: PROPS[K] extends JsonSchemaAnyBuilder<infer IN, any, any> ? IN : never
    }
  >,
  Expand<
    {
      [K in keyof PROPS as PROPS[K] extends JsonSchemaAnyBuilder<any, any, infer IsOpt>
        ? IsOpt extends true
          ? never
          : K
        : never]: PROPS[K] extends JsonSchemaAnyBuilder<any, infer OUT, any> ? OUT : never
    } & {
      [K in keyof PROPS as PROPS[K] extends JsonSchemaAnyBuilder<any, any, infer IsOpt>
        ? IsOpt extends true
          ? K
          : never
        : never]?: PROPS[K] extends JsonSchemaAnyBuilder<any, infer OUT, any> ? OUT : never
    }
  >,
  Opt
> {
  constructor(props?: PROPS) {
    super({
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    })

    if (props) this.addProperties(props)
  }

  addProperties(props: PROPS): this {
    const properties: Record<string, JsonSchema> = {}
    const required: string[] = []

    for (const [key, builder] of Object.entries(props)) {
      const isOptional = (builder as JsonSchemaTerminal<any, any, any>).getSchema().optionalField
      if (!isOptional) {
        required.push(key)
      }

      const schema = builder.build()
      properties[key] = schema
    }

    this.schema.properties = properties
    this.schema.required = _uniq(required).sort()

    return this
  }

  /**
   * When set, the validation will not strip away properties that are not specified explicitly in the schema.
   */
  allowAdditionalProperties(): this {
    _objectAssign(this.schema, { additionalProperties: true })
    return this
  }

  extend<NEW_PROPS extends Record<string, JsonSchemaAnyBuilder<any, any, any>>>(
    props: NEW_PROPS,
  ): JsonSchemaObjectInferringBuilder<
    {
      [K in keyof PROPS | keyof NEW_PROPS]: K extends keyof NEW_PROPS
        ? NEW_PROPS[K]
        : K extends keyof PROPS
          ? PROPS[K]
          : never
    },
    Opt
  > {
    const newBuilder = new JsonSchemaObjectInferringBuilder<PROPS, Opt>()
    _objectAssign(newBuilder.schema, _deepCopy(this.schema))

    const incomingSchemaBuilder = new JsonSchemaObjectInferringBuilder<NEW_PROPS, false>(props)
    mergeJsonSchemaObjects(newBuilder.schema as any, incomingSchemaBuilder.schema as any)

    return newBuilder as JsonSchemaObjectInferringBuilder<
      {
        [K in keyof PROPS | keyof NEW_PROPS]: K extends keyof NEW_PROPS
          ? NEW_PROPS[K]
          : K extends keyof PROPS
            ? PROPS[K]
            : never
      },
      Opt
    >
  }

  /**
   * Extends the current schema with `id`, `created` and `updated` according to NC DB conventions.
   */
  // oxlint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
  dbEntity() {
    return this.extend({
      id: j.string(),
      created: j.number().unixTimestamp2000(),
      updated: j.number().unixTimestamp2000(),
    })
  }
}

@immutable
export class JsonSchemaArrayBuilder<IN, OUT, Opt> extends JsonSchemaAnyBuilder<IN[], OUT[], Opt> {
  constructor(itemsSchema: JsonSchemaAnyBuilder<IN, OUT, Opt>) {
    super({
      type: 'array',
      items: itemsSchema.build(),
    })
  }

  minLength(minItems: number): this {
    _objectAssign(this.schema, { minItems })
    return this
  }

  maxLength(maxItems: number): this {
    _objectAssign(this.schema, { maxItems })
    return this
  }

  length(exactLength: number): this
  length(minItems: number, maxItems: number): this
  length(minItemsOrExact: number, maxItems?: number): this {
    const maxItemsActual = maxItems ?? minItemsOrExact
    return this.minLength(minItemsOrExact).maxLength(maxItemsActual)
  }

  exactLength(length: number): this {
    return this.minLength(length).maxLength(length)
  }

  unique(): this {
    _objectAssign(this.schema, { uniqueItems: true })
    return this
  }
}

@immutable
export class JsonSchemaSet2Builder<IN, OUT, Opt> extends JsonSchemaAnyBuilder<
  Iterable<IN>,
  Set2<OUT>,
  Opt
> {
  constructor(itemsSchema: JsonSchemaAnyBuilder<IN, OUT, Opt>) {
    super({
      type: ['array', 'object'],
      Set2: itemsSchema.build(),
    })
  }

  min(minItems: number): this {
    _objectAssign(this.schema, { minItems })
    return this
  }

  max(maxItems: number): this {
    _objectAssign(this.schema, { maxItems })
    return this
  }
}

export class JsonSchemaBufferBuilder extends JsonSchemaAnyBuilder<
  string | any[] | ArrayBuffer | Buffer,
  Buffer,
  false
> {
  constructor() {
    super({
      Buffer: true,
    })
  }
}

@immutable
export class JsonSchemaEnumBuilder<
  IN extends string | number | boolean | null,
  OUT extends IN = IN,
  Opt extends boolean = false,
> extends JsonSchemaAnyBuilder<IN, OUT, Opt> {
  constructor(enumValues: readonly IN[], baseType: EnumBaseType, opt?: JsonBuilderRuleOpt) {
    const jsonSchema: JsonSchema = { enum: enumValues }
    // Specifying the base type helps in cases when we ask Ajv to coerce the types.
    // Having only the `enum` in the schema does not trigger a coercion in Ajv.
    if (baseType === 'string') jsonSchema.type = 'string'
    if (baseType === 'number') jsonSchema.type = 'number'

    super(jsonSchema)

    if (opt?.name) this.setErrorMessage('pattern', `is not a valid ${opt.name}`)
    if (opt?.msg) this.setErrorMessage('enum', opt.msg)
  }

  branded<B extends IN>(): JsonSchemaEnumBuilder<B | IN, B, Opt> {
    return this as unknown as JsonSchemaEnumBuilder<B | IN, B, Opt>
  }
}

type EnumBaseType = 'string' | 'number' | 'other'

export interface JsonSchema<IN = unknown, OUT = IN> {
  readonly in?: IN
  readonly out?: OUT

  $schema?: string
  $id?: string
  title?: string
  description?: string
  // $comment?: string
  deprecated?: boolean
  readOnly?: boolean
  writeOnly?: boolean

  type?: string | string[]
  items?: JsonSchema
  properties?: {
    [K in keyof IN & keyof OUT]: JsonSchema<IN[K], OUT[K]>
  }
  patternProperties?: StringMap<JsonSchema<any, any>>
  required?: string[]
  additionalProperties?: boolean
  minProperties?: number
  maxProperties?: number

  default?: IN

  // https://json-schema.org/understanding-json-schema/reference/conditionals.html#id6
  if?: JsonSchema
  then?: JsonSchema
  else?: JsonSchema

  anyOf?: JsonSchema[]
  oneOf?: JsonSchema[]

  /**
   * This is a temporary "intermediate AST" field that is used inside the parser.
   * In the final schema this field will NOT be present.
   */
  optionalField?: true

  pattern?: string
  minLength?: number
  maxLength?: number
  format?: string

  contentMediaType?: string
  contentEncoding?: string // e.g 'base64'

  multipleOf?: number
  minimum?: number
  exclusiveMinimum?: number
  maximum?: number
  exclusiveMaximum?: number
  minItems?: number
  maxItems?: number
  uniqueItems?: boolean

  enum?: any

  hasIsOfTypeCheck?: boolean

  // Below we add custom Ajv keywords

  email?: JsonSchemaStringEmailOptions
  Set2?: JsonSchema
  Buffer?: true
  IsoDate?: JsonSchemaIsoDateOptions
  IsoDateTime?: true
  instanceof?: string | string[]
  transform?: { trim?: true; toLowerCase?: true; toUpperCase?: true; truncate?: number }
  errorMessages?: StringMap<string>
  optionalValues?: (string | number | boolean)[]
  keySchema?: JsonSchema
}

function object(props: AnyObject): never
function object<IN extends AnyObject>(props: {
  [K in keyof Required<IN>]-?: JsonSchemaAnyBuilder<any, IN[K], any>
}): JsonSchemaObjectBuilder<IN, IN, false>

function object<IN extends AnyObject>(props: {
  [key in keyof IN]: JsonSchemaAnyBuilder<any, IN[key], any>
}): JsonSchemaObjectBuilder<IN, IN, false> {
  return new JsonSchemaObjectBuilder<IN, IN, false>(props)
}

function objectInfer<P extends Record<string, JsonSchemaAnyBuilder<any, any, any>>>(
  props: P,
): JsonSchemaObjectInferringBuilder<P, false> {
  return new JsonSchemaObjectInferringBuilder<P, false>(props)
}

function objectDbEntity(props: AnyObject): never
function objectDbEntity<
  IN extends BaseDBEntity & AnyObject,
  EXTRA_KEYS extends Exclude<keyof IN, keyof BaseDBEntity> = Exclude<keyof IN, keyof BaseDBEntity>,
>(
  props: {
    // ✅ all non-system fields must be explicitly provided
    [K in EXTRA_KEYS]-?: BuilderFor<IN[K]>
  } &
    // ✅ if `id` differs, it’s required
    (ExactMatch<IN['id'], BaseDBEntity['id']> extends true
      ? { id?: BuilderFor<BaseDBEntity['id']> }
      : { id: BuilderFor<IN['id']> }) &
    (ExactMatch<IN['created'], BaseDBEntity['created']> extends true
      ? { created?: BuilderFor<BaseDBEntity['created']> }
      : { created: BuilderFor<IN['created']> }) &
    (ExactMatch<IN['updated'], BaseDBEntity['updated']> extends true
      ? { updated?: BuilderFor<BaseDBEntity['updated']> }
      : { updated: BuilderFor<IN['updated']> }),
): JsonSchemaObjectBuilder<IN, IN, false>

function objectDbEntity(props: AnyObject): any {
  return j.object({
    id: j.string(),
    created: j.number().unixTimestamp2000(),
    updated: j.number().unixTimestamp2000(),
    ...props,
  })
}

function record<
  KS extends JsonSchemaAnyBuilder<any, any, any>,
  VS extends JsonSchemaAnyBuilder<any, any, any>,
  Opt extends boolean = SchemaOpt<VS>,
>(
  keySchema: KS,
  valueSchema: VS,
): JsonSchemaObjectBuilder<
  Opt extends true
    ? Partial<Record<SchemaIn<KS>, SchemaIn<VS>>>
    : Record<SchemaIn<KS>, SchemaIn<VS>>,
  Opt extends true
    ? Partial<Record<SchemaOut<KS>, SchemaOut<VS>>>
    : Record<SchemaOut<KS>, SchemaOut<VS>>,
  false
> {
  const keyJsonSchema = keySchema.build()
  const valueJsonSchema = valueSchema.build()

  return new JsonSchemaObjectBuilder<
    Opt extends true
      ? Partial<Record<SchemaIn<KS>, SchemaIn<VS>>>
      : Record<SchemaIn<KS>, SchemaIn<VS>>,
    Opt extends true
      ? Partial<Record<SchemaOut<KS>, SchemaOut<VS>>>
      : Record<SchemaOut<KS>, SchemaOut<VS>>,
    false
  >([], {
    hasIsOfTypeCheck: false,
    keySchema: keyJsonSchema,
    patternProperties: {
      ['^.*$']: valueJsonSchema,
    },
  })
}

function withRegexKeys<
  S extends JsonSchemaAnyBuilder<any, any, any>,
  Opt extends boolean = SchemaOpt<S>,
>(
  keyRegex: RegExp | string,
  schema: S,
): JsonSchemaObjectBuilder<
  Opt extends true ? StringMap<SchemaIn<S>> : StringMap<SchemaIn<S>>,
  Opt extends true ? StringMap<SchemaOut<S>> : StringMap<SchemaOut<S>>,
  false
> {
  const pattern = keyRegex instanceof RegExp ? keyRegex.source : keyRegex
  const jsonSchema = schema.build()

  return new JsonSchemaObjectBuilder<
    Opt extends true ? StringMap<SchemaIn<S>> : StringMap<SchemaIn<S>>,
    Opt extends true ? StringMap<SchemaOut<S>> : StringMap<SchemaOut<S>>,
    false
  >([], {
    hasIsOfTypeCheck: false,
    patternProperties: {
      [pattern]: jsonSchema,
    },
  })
}

/**
 * Builds the object schema with the indicated `keys` and uses the `schema` for their validation.
 */
function withEnumKeys<
  const T extends readonly (string | number)[] | StringEnum | NumberEnum,
  S extends JsonSchemaAnyBuilder<any, any, any>,
  K extends string | number = EnumKeyUnion<T>,
  Opt extends boolean = SchemaOpt<S>,
>(
  keys: T,
  schema: S,
): JsonSchemaObjectBuilder<
  Opt extends true ? { [P in K]?: SchemaIn<S> } : { [P in K]: SchemaIn<S> },
  Opt extends true ? { [P in K]?: SchemaOut<S> } : { [P in K]: SchemaOut<S> },
  false
> {
  let enumValues: readonly (string | number)[] | undefined
  if (Array.isArray(keys)) {
    _assert(
      isEveryItemPrimitive(keys),
      'Every item in the key list should be string, number or symbol',
    )
    enumValues = keys
  } else if (typeof keys === 'object') {
    const enumType = getEnumType(keys)
    _assert(
      enumType === 'NumberEnum' || enumType === 'StringEnum',
      'The key list should be StringEnum or NumberEnum',
    )
    if (enumType === 'NumberEnum') {
      enumValues = _numberEnumValues(keys as NumberEnum)
    } else if (enumType === 'StringEnum') {
      enumValues = _stringEnumValues(keys as StringEnum)
    }
  }

  _assert(enumValues, 'The key list should be an array of values, NumberEnum or a StringEnum')

  const typedValues = enumValues as readonly K[]
  const props = Object.fromEntries(typedValues.map(key => [key, schema])) as any

  return new JsonSchemaObjectBuilder<
    Opt extends true ? { [P in K]?: SchemaIn<S> } : { [P in K]: SchemaIn<S> },
    Opt extends true ? { [P in K]?: SchemaOut<S> } : { [P in K]: SchemaOut<S> },
    false
  >(props, { hasIsOfTypeCheck: false })
}

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never

type ExactMatch<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

type BuilderOutUnion<B extends readonly JsonSchemaAnyBuilder<any, any, any>[]> = {
  [K in keyof B]: B[K] extends JsonSchemaAnyBuilder<any, infer O, any> ? O : never
}[number]

type BuilderInUnion<B extends readonly JsonSchemaAnyBuilder<any, any, any>[]> = {
  [K in keyof B]: B[K] extends JsonSchemaAnyBuilder<infer I, any, any> ? I : never
}[number]

type BuilderFor<T> = JsonSchemaAnyBuilder<any, T, any>

interface JsonBuilderRuleOpt {
  /**
   * Text of error message to return when the validation fails for the given rule:
   *
   * `{ msg: "is not a valid Oompa-loompa" } => "Object.property is not a valid Oompa-loompa"`
   */
  msg?: string
  /**
   * A friendly name for what we are validating, that will be used in error messages:
   *
   * `{ name: "Oompa-loompa" } => "Object.property is not a valid Oompa-loompa"`
   */
  name?: string
}

type EnumKeyUnion<T> =
  // array of literals -> union of its elements
  T extends readonly (infer U)[]
    ? U
    : // enum object -> union of its values
      T extends StringEnum | NumberEnum
      ? T[keyof T]
      : never

type SchemaIn<S> = S extends JsonSchemaAnyBuilder<infer IN, any, any> ? IN : never
type SchemaOut<S> = S extends JsonSchemaAnyBuilder<any, infer OUT, any> ? OUT : never
type SchemaOpt<S> =
  S extends JsonSchemaAnyBuilder<any, any, infer Opt> ? (Opt extends true ? true : false) : false

function immutable<T extends { new (...args: any[]): AnyObject }>(constructor: T): T {
  const proto = constructor.prototype

  for (const name of Object.getOwnPropertyNames(proto)) {
    if (name === 'constructor') continue

    const desc = Object.getOwnPropertyDescriptor(proto, name)
    if (!desc || typeof desc.value !== 'function') continue
    if (isAllowedToMutate(name)) continue

    const original = desc.value

    Object.defineProperty(proto, name, {
      ...desc,
      value(...args: any[]) {
        // Create a clone and run the function on the clone
        const oldJsonSchema = this.schema
        const clone = this.clone()
        const result = original.apply(clone, args)

        // If the result is the clone, then the function is chainable...
        if (result === clone) {
          // ...then we need to figure out if the function modified the JsonSchema
          const oldJsonSchemaStr = _stringify(oldJsonSchema)
          const newJsonSchema = clone.schema
          const newJsonSchemaStr = _stringify(newJsonSchema)

          // If it was modified, then cloning was necessary, we return the clone
          if (oldJsonSchemaStr !== newJsonSchemaStr) return clone
        }

        // Otherwise the function can run on the original object
        return original.apply(this, args)
      },
    })
  }

  return constructor
}

function isAllowedToMutate(name: string): boolean {
  return ['clone', 'build', 'getSchema', 'addProperties'].includes(name)
}
