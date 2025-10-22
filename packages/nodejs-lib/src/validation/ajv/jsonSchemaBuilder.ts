/* eslint-disable id-denylist */
// oxlint-disable max-lines

import { _isUndefined } from '@naturalcycles/js-lib'
import { _uniq } from '@naturalcycles/js-lib/array'
import { JSON_SCHEMA_ORDER } from '@naturalcycles/js-lib/json-schema'
import type { Set2 } from '@naturalcycles/js-lib/object'
import { _deepCopy, _sortObject } from '@naturalcycles/js-lib/object'
import {
  type AnyObject,
  type IsoDate,
  type IsoDateTime,
  JWT_REGEX,
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
    return this.regex(regex).trim().toLowerCase()
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

  branded<B extends string>(): JsonSchemaStringBuilder<B | IN, B, Opt> {
    return this as unknown as JsonSchemaStringBuilder<B | IN, B, Opt>
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
    return this.regex(JWT_REGEX)
  }

  url(): this {
    // from `ajv-formats`
    const regex =
      /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00A1}-\u{FFFF}]+-)*[a-z0-9\u{00A1}-\u{FFFF}]+)(?:\.(?:[a-z0-9\u{00A1}-\u{FFFF}]+-)*[a-z0-9\u{00A1}-\u{FFFF}]+)*(?:\.(?:[a-z\u{00A1}-\u{FFFF}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu
    return this.regex(regex)
  }

  ipv4(): this {
    // from `ajv-formats`
    const regex =
      /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/
    return this.regex(regex)
  }

  ipv6(): this {
    // from `ajv-formats`
    const regex =
      /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i
    return this.regex(regex)
  }

  id(): this {
    const regex = /^[a-z0-9_]{6,64}$/
    return this.regex(regex)
  }

  slug(): this {
    const regex = /^[a-z0-9-]+$/
    return this.regex(regex)
  }

  semVer(): this {
    const regex = /^[0-9]+\.[0-9]+\.[0-9]+$/
    return this.regex(regex)
  }

  languageTag(): this {
    // IETF language tag (https://en.wikipedia.org/wiki/IETF_language_tag)
    const regex = /^[a-z]{2}(-[A-Z]{2})?$/
    return this.regex(regex)
  }

  countryCode(): this {
    const regex = /^[A-Z]{2}$/
    return this.regex(regex)
  }

  currency(): this {
    const regex = /^[A-Z]{3}$/
    return this.regex(regex)
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

  branded<B extends number>(): JsonSchemaNumberBuilder<B | IN, B, Opt> {
    return this as unknown as JsonSchemaNumberBuilder<B | IN, B, Opt>
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

  unixTimestamp(): JsonSchemaNumberBuilder<UnixTimestamp | number, UnixTimestamp, Opt> {
    return this.integer().min(0).max(TS_2500).branded<UnixTimestamp>()
  }

  unixTimestamp2000(): JsonSchemaNumberBuilder<UnixTimestamp | number, UnixTimestamp, Opt> {
    return this.integer().min(TS_2000).max(TS_2500).branded<UnixTimestamp>()
  }

  unixTimestampMillis(): JsonSchemaNumberBuilder<
    UnixTimestampMillis | number,
    UnixTimestampMillis,
    Opt
  > {
    return this.integer().min(0).max(TS_2500_MILLIS).branded<UnixTimestampMillis>()
  }

  unixTimestamp2000Millis(): JsonSchemaNumberBuilder<
    UnixTimestampMillis | number,
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

  // Below we add custom Ajv keywords

  Set2?: JsonSchema
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

interface JsonBuilderRuleOpt {
  msg?: string
}
