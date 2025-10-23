/* eslint-disable id-denylist */
// oxlint-disable max-lines

import {
  _isUndefined,
  _numberEnumValues,
  _stringEnumValues,
  getEnumType,
} from '@naturalcycles/js-lib'
import { _uniq } from '@naturalcycles/js-lib/array'
import { _assert } from '@naturalcycles/js-lib/error'
import { JSON_SCHEMA_ORDER, mergeJsonSchemaObjects } from '@naturalcycles/js-lib/json-schema'
import type { Set2 } from '@naturalcycles/js-lib/object'
import { _deepCopy, _sortObject } from '@naturalcycles/js-lib/object'
import {
  type AnyObject,
  type IsoDate,
  type IsoDateTime,
  JWT_REGEX,
  type NumberEnum,
  type StringEnum,
  type StringMap,
  type UnixTimestamp,
  type UnixTimestampMillis,
} from '@naturalcycles/js-lib/types'

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

  object<P extends Record<string, JsonSchemaAnyBuilder<any, any, any>>>(
    props: P,
  ): JsonSchemaObjectBuilder<P, false> {
    return new JsonSchemaObjectBuilder<P, false>(props)
  },

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

    if (Array.isArray(input)) {
      enumValues = input
    } else if (typeof input === 'object') {
      const enumType = getEnumType(input)
      if (enumType === 'NumberEnum') {
        enumValues = _numberEnumValues(input as NumberEnum)
      } else if (enumType === 'StringEnum') {
        enumValues = _stringEnumValues(input as StringEnum)
      }
    }

    _assert(enumValues, 'Unsupported enum input')
    return new JsonSchemaEnumBuilder(enumValues as any)
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

export class JsonSchemaAnyBuilder<IN, OUT, Opt> {
  constructor(protected schema: JsonSchema) {}

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
   * ```
   */
  isOfType<ExpectedType>(): ExactMatch<ExpectedType, OUT> extends true ? this : never {
    Object.assign(this.schema, { hasIsOfTypeCheck: true })
    return this as any
  }

  getSchema(): JsonSchema {
    return this.schema
  }

  $schema($schema: string): this {
    Object.assign(this.schema, { $schema })
    return this
  }

  $schemaDraft7(): this {
    this.$schema('http://json-schema.org/draft-07/schema#')
    return this
  }

  $id($id: string): this {
    Object.assign(this.schema, { $id })
    return this
  }

  title(title: string): this {
    Object.assign(this.schema, { title })
    return this
  }

  description(description: string): this {
    Object.assign(this.schema, { description })
    return this
  }

  deprecated(deprecated = true): this {
    Object.assign(this.schema, { deprecated })
    return this
  }

  type(type: string): this {
    Object.assign(this.schema, { type })
    return this
  }

  default(v: any): this {
    Object.assign(this.schema, { default: v })
    return this
  }

  instanceof(of: string): this {
    Object.assign(this.schema, { type: 'object', instanceof: of })
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
   * Produces a "clean schema object" without methods.
   * Same as if it would be JSON.stringified.
   */
  build(): JsonSchema<IN, OUT> {
    return _sortObject(JSON.parse(JSON.stringify(this.schema)), JSON_SCHEMA_ORDER)
  }

  clone(): JsonSchemaAnyBuilder<IN, OUT, Opt> {
    return new JsonSchemaAnyBuilder<IN, OUT, Opt>(_deepCopy(this.schema))
  }

  /**
   * @experimental
   */
  in!: IN
  out!: OUT
}

export class JsonSchemaStringBuilder<
  IN extends string = string,
  OUT = IN,
  Opt extends boolean = false,
> extends JsonSchemaAnyBuilder<IN, OUT, Opt> {
  constructor() {
    super({
      type: 'string',
    })
  }

  regex(pattern: RegExp, opt?: JsonBuilderRuleOpt): this {
    return this.pattern(pattern.source, opt)
  }

  pattern(pattern: string, opt?: JsonBuilderRuleOpt): this {
    if (opt?.msg) this.setErrorMessage('pattern', opt.msg)
    Object.assign(this.schema, { pattern })
    return this
  }

  min(minLength: number): this {
    Object.assign(this.schema, { minLength })
    return this
  }

  max(maxLength: number): this {
    Object.assign(this.schema, { maxLength })
    return this
  }

  length(minLength: number, maxLength: number): this {
    Object.assign(this.schema, { minLength, maxLength })
    return this
  }

  email(opt?: Partial<JsonSchemaStringEmailOptions>): this {
    const defaultOptions: JsonSchemaStringEmailOptions = { checkTLD: true }
    Object.assign(this.schema, { email: { ...defaultOptions, ...opt } })

    // from `ajv-formats`
    const regex =
      /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i
    return this.regex(regex, { msg: 'is not a valid email address' }).trim().toLowerCase()
  }

  trim(): this {
    Object.assign(this.schema, { transform: { ...this.schema.transform, trim: true } })
    return this
  }

  toLowerCase(): this {
    Object.assign(this.schema, { transform: { ...this.schema.transform, toLowerCase: true } })
    return this
  }

  toUpperCase(): this {
    Object.assign(this.schema, { transform: { ...this.schema.transform, toUpperCase: true } })
    return this
  }

  truncate(toLength: number): this {
    Object.assign(this.schema, { transform: { ...this.schema.transform, truncate: toLength } })
    return this
  }

  branded<B extends string>(): JsonSchemaStringBuilder<B, B, Opt> {
    return this as unknown as JsonSchemaStringBuilder<B, B, Opt>
  }

  isoDate(): JsonSchemaStringBuilder<IsoDate | IN, IsoDate, Opt> {
    Object.assign(this.schema, { IsoDate: true })
    return this.branded<IsoDate>()
  }

  isoDateTime(): JsonSchemaStringBuilder<IsoDateTime | IN, IsoDateTime, Opt> {
    Object.assign(this.schema, { IsoDateTime: true })
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
    // from `ajv-formats`
    const regex =
      /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/
    return this.regex(regex, { msg: 'is not a valid IPv4 format' })
  }

  ipv6(): this {
    // from `ajv-formats`
    const regex =
      /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i
    return this.regex(regex, { msg: 'is not a valid IPv6 format' })
  }

  id(): this {
    const regex = /^[a-z0-9_]{6,64}$/
    return this.regex(regex, { msg: 'is not a valid ID format' })
  }

  slug(): this {
    const regex = /^[a-z0-9-]+$/
    return this.regex(regex, { msg: 'is not a valid slug format' })
  }

  semVer(): this {
    const regex = /^[0-9]+\.[0-9]+\.[0-9]+$/
    return this.regex(regex, { msg: 'is not a valid semver format' })
  }

  languageTag(): this {
    // IETF language tag (https://en.wikipedia.org/wiki/IETF_language_tag)
    const regex = /^[a-z]{2}(-[A-Z]{2})?$/
    return this.regex(regex, { msg: 'is not a valid language format' })
  }

  countryCode(): this {
    const regex = /^[A-Z]{2}$/
    return this.regex(regex, { msg: 'is not a valid country code format' })
  }

  currency(): this {
    const regex = /^[A-Z]{3}$/
    return this.regex(regex, { msg: 'is not a valid currency format' })
  }
}

export interface JsonSchemaStringEmailOptions {
  checkTLD: boolean
}

export class JsonSchemaNumberBuilder<
  IN extends number = number,
  OUT = IN,
  Opt extends boolean = false,
> extends JsonSchemaAnyBuilder<IN, OUT, Opt> {
  constructor() {
    super({
      type: 'number',
    })
  }

  integer(): this {
    Object.assign(this.schema, { type: 'integer' })
    return this
  }

  branded<B extends number>(): JsonSchemaNumberBuilder<B, B, Opt> {
    return this as unknown as JsonSchemaNumberBuilder<B, B, Opt>
  }

  multipleOf(multipleOf: number): this {
    Object.assign(this.schema, { multipleOf })
    return this
  }

  min(minimum: number): this {
    Object.assign(this.schema, { minimum })
    return this
  }

  exclusiveMin(exclusiveMinimum: number): this {
    Object.assign(this.schema, { exclusiveMinimum })
    return this
  }

  max(maximum: number): this {
    Object.assign(this.schema, { maximum })
    return this
  }

  exclusiveMax(exclusiveMaximum: number): this {
    Object.assign(this.schema, { exclusiveMaximum })
    return this
  }

  /**
   * Both ranges are inclusive.
   */
  range(minimum: number, maximum: number): this {
    Object.assign(this.schema, { minimum, maximum })
    return this
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

export class JsonSchemaBooleanBuilder<
  IN extends boolean = boolean,
  OUT = IN,
  Opt extends boolean = false,
> extends JsonSchemaAnyBuilder<IN, OUT, Opt> {
  constructor() {
    super({
      type: 'boolean',
    })
  }
}

export class JsonSchemaObjectBuilder<
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
      const schema = builder.build()
      if (!schema.optionalField) {
        required.push(key)
      } else {
        schema.optionalField = undefined
      }
      properties[key] = schema
    }

    this.schema.properties = properties
    this.schema.required = _uniq(required).sort()

    return this
  }

  extend<NEW_PROPS extends Record<string, JsonSchemaAnyBuilder<any, any, any>>>(
    props: NEW_PROPS,
  ): JsonSchemaObjectBuilder<
    {
      [K in keyof PROPS | keyof NEW_PROPS]: K extends keyof NEW_PROPS
        ? NEW_PROPS[K]
        : K extends keyof PROPS
          ? PROPS[K]
          : never
    },
    Opt
  > {
    const newBuilder = new JsonSchemaObjectBuilder<PROPS, Opt>()
    Object.assign(newBuilder.schema, _deepCopy(this.schema))

    const incomingSchemaBuilder = new JsonSchemaObjectBuilder<NEW_PROPS, false>(props)
    mergeJsonSchemaObjects(newBuilder.schema as any, incomingSchemaBuilder.schema as any)

    return newBuilder as JsonSchemaObjectBuilder<
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
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
  dbEntity() {
    return this.extend({
      id: j.string(),
      created: j.number().unixTimestamp2000(),
      updated: j.number().unixTimestamp2000(),
    })
  }
}

export class JsonSchemaArrayBuilder<IN, OUT, Opt> extends JsonSchemaAnyBuilder<IN[], OUT[], Opt> {
  constructor(itemsSchema: JsonSchemaAnyBuilder<IN, OUT, Opt>) {
    super({
      type: 'array',
      items: itemsSchema.build(),
    })
  }

  min(minItems: number): this {
    Object.assign(this.schema, { minItems })
    return this
  }

  max(maxItems: number): this {
    Object.assign(this.schema, { maxItems })
    return this
  }

  unique(uniqueItems: number): this {
    Object.assign(this.schema, { uniqueItems })
    return this
  }
}

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
    Object.assign(this.schema, { minItems })
    return this
  }

  max(maxItems: number): this {
    Object.assign(this.schema, { maxItems })
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

export class JsonSchemaEnumBuilder<
  IN extends string | number | boolean | null,
  OUT extends IN = IN,
  Opt extends boolean = false,
> extends JsonSchemaAnyBuilder<IN, OUT, Opt> {
  constructor(enumValues: readonly IN[]) {
    super({ enum: enumValues })
  }
}

export interface JsonSchema<IN = unknown, OUT = IN> {
  readonly in?: IN
  readonly out?: OUT

  $schema?: AnyObject
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

  enum?: any

  // Below we add custom Ajv keywords

  Set2?: JsonSchema
  Buffer?: true
  IsoDate?: true
  IsoDateTime?: true
  instanceof?: string | string[]
  transform?: { trim?: true; toLowerCase?: true; toUpperCase?: true; truncate?: number }
  errorMessages?: StringMap<string>
  hasIsOfTypeCheck?: boolean
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

interface JsonBuilderRuleOpt {
  msg?: string
}
