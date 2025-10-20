/* eslint-disable id-denylist */
// oxlint-disable max-lines

import { _uniq } from '../array/array.util.js'
import { _deepCopy } from '../object/object.util.js'
import type { Set2 } from '../object/set2.js'
import { _sortObject } from '../object/sortObject.js'
import { type AnyObject, type IsoDate, type IsoDateTime, JWT_REGEX } from '../types.js'
import { JSON_SCHEMA_ORDER } from './jsonSchema.cnst.js'

export const j2 = {
  string(): JsonSchemaStringBuilder2<string, string, false> {
    return new JsonSchemaStringBuilder2()
  },

  object<P extends Record<string, JsonSchemaAnyBuilder2<any, any, any>>>(
    props: P,
  ): JsonSchemaObjectBuilder2<P, false> {
    return new JsonSchemaObjectBuilder2<P, false>(props)
  },

  array<IN, OUT, Opt>(
    itemSchema: JsonSchemaAnyBuilder2<IN, OUT, Opt>,
  ): JsonSchemaArrayBuilder2<IN, OUT, Opt> {
    return new JsonSchemaArrayBuilder2(itemSchema)
  },

  set<IN, OUT, Opt>(
    itemSchema: JsonSchemaAnyBuilder2<IN, OUT, Opt>,
  ): JsonSchemaSet2Builder2<IN, OUT, Opt> {
    return new JsonSchemaSet2Builder2(itemSchema)
  },
}

/*
  Notes for future reference

  Q: Why do we need `Opt` - when `IN` and `OUT` already carries the `| undefined`?
  A: Because of objects. Without `Opt`, an optional field would be inferred as `{ foo: string | undefined }`,
     which means that the `foo` property would be mandatory, it's just that its value can be `undefined` as well.
     With `Opt`, we can infer it as `{ foo?: string | undefined }`.
*/

export class JsonSchemaAnyBuilder2<IN, OUT, Opt> {
  constructor(protected schema: JsonSchema2) {}

  expectType<ExpectedType>(): ExactMatch<ExpectedType, OUT> extends true ? this : never {
    return this as any
  }

  getSchema(): JsonSchema2 {
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

  optional(): JsonSchemaAnyBuilder2<IN | undefined, OUT | undefined, true> {
    this.schema.optionalField = true
    return this as unknown as JsonSchemaAnyBuilder2<IN | undefined, OUT | undefined, true>
  }

  nullable(): JsonSchemaAnyBuilder2<IN | null, OUT | null, Opt> {
    return new JsonSchemaAnyBuilder2({
      anyOf: [this.build(), { type: 'null' }],
    })
  }

  /**
   * Produces a "clean schema object" without methods.
   * Same as if it would be JSON.stringified.
   */
  build(): JsonSchema2<IN, OUT> {
    return _sortObject(JSON.parse(JSON.stringify(this.schema)), JSON_SCHEMA_ORDER)
  }

  clone(): JsonSchemaAnyBuilder2<IN, OUT, Opt> {
    return new JsonSchemaAnyBuilder2<IN, OUT, Opt>(_deepCopy(this.schema))
  }

  /**
   * @experimental
   */
  in!: IN
  out!: OUT
}

export class JsonSchemaStringBuilder2<
  IN extends string = string,
  OUT = IN,
  Opt extends boolean = false,
> extends JsonSchemaAnyBuilder2<IN, OUT, Opt> {
  constructor() {
    super({
      type: 'string',
    })
  }

  regex(pattern: RegExp): this {
    return this.pattern(pattern.source)
  }

  pattern(pattern: string): this {
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

  branded<B extends string>(): JsonSchemaStringBuilder2<B | IN, B, Opt> {
    return this as unknown as JsonSchemaStringBuilder2<B | IN, B, Opt>
  }

  isoDate(): JsonSchemaStringBuilder2<IsoDate | IN, IsoDate, Opt> {
    Object.assign(this.schema, { IsoDate: true })
    return this.branded<IsoDate>()
  }

  isoDateTime(): JsonSchemaStringBuilder2<IsoDateTime | IN, IsoDateTime, Opt> {
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

export class JsonSchemaObjectBuilder2<
  PROPS extends Record<string, JsonSchemaAnyBuilder2<any, any, any>>,
  Opt extends boolean = false,
> extends JsonSchemaAnyBuilder2<
  Expand<
    {
      [K in keyof PROPS as PROPS[K] extends JsonSchemaAnyBuilder2<any, any, infer IsOpt>
        ? IsOpt extends true
          ? never
          : K
        : never]: PROPS[K] extends JsonSchemaAnyBuilder2<infer IN, any, any> ? IN : never
    } & {
      [K in keyof PROPS as PROPS[K] extends JsonSchemaAnyBuilder2<any, any, infer IsOpt>
        ? IsOpt extends true
          ? K
          : never
        : never]?: PROPS[K] extends JsonSchemaAnyBuilder2<infer IN, any, any> ? IN : never
    }
  >,
  Expand<
    {
      [K in keyof PROPS as PROPS[K] extends JsonSchemaAnyBuilder2<any, any, infer IsOpt>
        ? IsOpt extends true
          ? never
          : K
        : never]: PROPS[K] extends JsonSchemaAnyBuilder2<any, infer OUT, any> ? OUT : never
    } & {
      [K in keyof PROPS as PROPS[K] extends JsonSchemaAnyBuilder2<any, any, infer IsOpt>
        ? IsOpt extends true
          ? K
          : never
        : never]?: PROPS[K] extends JsonSchemaAnyBuilder2<any, infer OUT, any> ? OUT : never
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
    const properties: Record<string, JsonSchema2> = {}
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

export class JsonSchemaArrayBuilder2<IN, OUT, Opt> extends JsonSchemaAnyBuilder2<IN[], OUT[], Opt> {
  constructor(itemsSchema: JsonSchemaAnyBuilder2<IN, OUT, Opt>) {
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

export class JsonSchemaSet2Builder2<IN, OUT, Opt> extends JsonSchemaAnyBuilder2<
  IN[] | Set2<IN>,
  Set2<OUT>,
  Opt
> {
  constructor(itemsSchema: JsonSchemaAnyBuilder2<IN, OUT, Opt>) {
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

export interface JsonSchema2<IN = unknown, OUT = IN> {
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
  items?: JsonSchema2
  properties?: {
    [K in keyof IN & keyof OUT]: JsonSchema2<IN[K], OUT[K]>
  }
  required?: string[]
  additionalProperties?: boolean
  minProperties?: number
  maxProperties?: number

  default?: IN

  // https://json-schema.org/understanding-json-schema/reference/conditionals.html#id6
  if?: JsonSchema2
  then?: JsonSchema2
  else?: JsonSchema2

  anyOf?: JsonSchema2[]

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

  // Below we add custom Ajv keywords

  Set2?: JsonSchema2
  IsoDate?: true
  IsoDateTime?: true
  instanceof?: string | string[]
  transform?: { trim?: true; toLowerCase?: true; toUpperCase?: true; truncate?: number }
}

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never

type ExactMatch<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
