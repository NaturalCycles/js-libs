import { _uniq } from '../array/array.util.js'
import { _numberEnumValues, _stringEnumValues, isNumberEnum, isStringEnum } from '../enum.util.js'
import { _deepCopy } from '../object/object.util.js'
import { _sortObject } from '../object/sortObject.js'
import {
  type AnyObject,
  type BaseDBEntity,
  type IsoDate,
  type IsoDateTime,
  JWT_REGEX,
  type NumberEnum,
  type StringEnum,
  type UnixTimestamp,
  type UnixTimestampMillis,
} from '../types.js'
import { JSON_SCHEMA_ORDER } from './jsonSchema.cnst.js'
import type {
  JsonSchema,
  JsonSchemaAllOf,
  JsonSchemaAny,
  JsonSchemaArray,
  JsonSchemaBoolean,
  JsonSchemaConst,
  JsonSchemaEnum,
  JsonSchemaNull,
  JsonSchemaNumber,
  JsonSchemaObject,
  JsonSchemaOneOf,
  JsonSchemaRef,
  JsonSchemaString,
  JsonSchemaTuple,
} from './jsonSchema.model.js'
import { mergeJsonSchemaObjects } from './jsonSchema.util.js'

/* eslint-disable id-blacklist, @typescript-eslint/explicit-module-boundary-types */

export interface JsonSchemaBuilder<T = unknown> {
  build: () => JsonSchema<T>
}

/**
 * Fluent (chainable) API to manually create Json Schemas.
 * Inspired by Joi and Zod.
 */
export const j = {
  any<T = unknown>() {
    return new JsonSchemaAnyBuilder<T, JsonSchemaAny<T>>({})
  },
  const<T extends string | number | boolean | null>(value: T) {
    return new JsonSchemaAnyBuilder<T, JsonSchemaConst<T>>({
      const: value,
    })
  },
  null() {
    return new JsonSchemaAnyBuilder<null, JsonSchemaNull>({
      type: 'null',
    })
  },
  ref<T = unknown>($ref: string) {
    return new JsonSchemaAnyBuilder<T, JsonSchemaRef<T>>({
      $ref,
    })
  },

  enum<const T extends readonly (string | number | boolean | null)[] | StringEnum | NumberEnum>(
    values: T,
  ) {
    let enumValues: readonly (string | number | boolean | null)[] | undefined

    if (Array.isArray(values)) {
      enumValues = values
    } else if (typeof values === 'object') {
      if (isNumberEnum(values)) {
        enumValues = _numberEnumValues(values)
      } else if (isStringEnum(values)) {
        enumValues = _stringEnumValues(values)
      }
    }

    if (!enumValues) throw new TypeError('Unsupported enum input')

    return new JsonSchemaAnyBuilder<
      T extends readonly (infer U)[]
        ? U
        : T extends StringEnum
          ? T[keyof T]
          : T extends NumberEnum
            ? T[keyof T]
            : never,
      JsonSchemaEnum<any>
    >({
      enum: enumValues as any[],
    })
  },

  boolean() {
    return new JsonSchemaAnyBuilder<boolean, JsonSchemaBoolean>({
      type: 'boolean',
    })
  },
  buffer() {
    return new JsonSchemaAnyBuilder<Buffer, JsonSchemaAny<Buffer>>({
      instanceof: 'Buffer',
    })
  },

  // number types
  number<T extends number = number>() {
    return new JsonSchemaNumberBuilder<T>()
  },
  integer<T extends number = number>() {
    return new JsonSchemaNumberBuilder<T>().integer()
  },

  // string types
  string<T extends string = string>() {
    return new JsonSchemaStringBuilder<T>()
  },

  // complex types
  object,
  dbEntity<T extends AnyObject>(props: T) {
    return j
      .object<BaseDBEntity>({
        id: j.string(),
        created: j.integer().unixTimestamp2000(),
        updated: j.integer().unixTimestamp2000(),
      })
      .extend(j.object(props))
  },

  rootObject<T extends AnyObject>(props: {
    [K in keyof T]: JsonSchemaAnyBuilder<T[K]>
  }) {
    return new JsonSchemaObjectBuilder<T>().addProperties(props).$schemaDraft7()
  },
  array<T extends JsonSchemaAnyBuilder<any>>(itemSchema: T) {
    return new JsonSchemaArrayBuilder<T['infer']>(itemSchema)
  },
  tuple<T extends any[] = unknown[]>(items: JsonSchemaAnyBuilder[]) {
    return new JsonSchemaTupleBuilder<T>(items)
  },
  oneOf<Builders extends JsonSchemaAnyBuilder<any, any, any>[]>(
    items: [...Builders],
  ): JsonSchemaAnyBuilder<
    Builders[number] extends JsonSchemaAnyBuilder<infer U, any, any> ? U : never,
    JsonSchemaOneOf<Builders[number] extends JsonSchemaAnyBuilder<infer U, any, any> ? U : never>
  > {
    return new JsonSchemaAnyBuilder({
      oneOf: items.map(b => b.build()),
    }) as any
  },
  allOf<T = unknown>(items: JsonSchemaAnyBuilder[]) {
    return new JsonSchemaAnyBuilder<T, JsonSchemaAllOf<T>>({
      allOf: items.map(b => b.build()),
    })
  },
}

export class JsonSchemaAnyBuilder<
  T = unknown,
  SCHEMA_TYPE extends JsonSchema<T> = JsonSchema<T>,
  Opt extends boolean = false,
> implements JsonSchemaBuilder<T>
{
  constructor(protected schema: SCHEMA_TYPE) {}

  /**
   * Used in ObjectBuilder to access schema.optionalProperty
   */
  getSchema(): SCHEMA_TYPE {
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
    this.schema.instanceof = of
    return this
  }

  optional(): JsonSchemaAnyBuilder<T | undefined, JsonSchema<T | undefined>, true>
  optional(optional: true): JsonSchemaAnyBuilder<T | undefined, JsonSchema<T | undefined>, true>
  optional(
    optional: false,
  ): JsonSchemaAnyBuilder<Exclude<T, undefined>, JsonSchema<Exclude<T, undefined>>, false>
  optional(optional = true): JsonSchemaAnyBuilder<any, JsonSchema<any>, false> {
    if (optional) {
      this.schema.optionalField = true
    } else {
      this.schema.optionalField = undefined
    }
    return this
  }

  nullable(): JsonSchemaAnyBuilder<T | null, JsonSchema<T | null>, Opt> {
    return new JsonSchemaAnyBuilder<T | null, JsonSchema<T | null>, Opt>({
      anyOf: [this.build(), { type: 'null' }],
    })
  }

  /**
   * Produces a "clean schema object" without methods.
   * Same as if it would be JSON.stringified.
   */
  build(): SCHEMA_TYPE {
    return _sortObject(JSON.parse(JSON.stringify(this.schema)), JSON_SCHEMA_ORDER)
  }

  clone(): JsonSchemaAnyBuilder<T, SCHEMA_TYPE, Opt> {
    return new JsonSchemaAnyBuilder<T, SCHEMA_TYPE, Opt>(_deepCopy(this.schema))
  }

  /**
   * @experimental
   */
  infer!: T
}

export class JsonSchemaNumberBuilder<
  T extends number = number,
  Opt extends boolean = false,
> extends JsonSchemaAnyBuilder<T, JsonSchemaNumber<T>, Opt> {
  constructor() {
    super({
      type: 'number',
    })
  }

  integer(): this {
    Object.assign(this.schema, { type: 'integer' })
    return this
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

  format(format: string): this {
    Object.assign(this.schema, { format })
    return this
  }

  int32 = (): this => this.format('int32')
  int64 = (): this => this.format('int64')
  float = (): this => this.format('float')
  double = (): this => this.format('double')

  unixTimestamp = (): JsonSchemaNumberBuilder<UnixTimestamp> =>
    this.integer().branded<UnixTimestamp>().format('unixTimestamp').description('UnixTimestamp')

  unixTimestamp2000 = (): JsonSchemaNumberBuilder<UnixTimestamp> =>
    this.integer()
      .branded<UnixTimestamp>()
      .format('unixTimestamp2000')
      .description('UnixTimestamp2000')

  unixTimestampMillis = (): JsonSchemaNumberBuilder<UnixTimestampMillis> =>
    this.integer()
      .branded<UnixTimestampMillis>()
      .format('unixTimestampMillis')
      .description('UnixTimestampMillis')

  unixTimestampMillis2000 = (): JsonSchemaNumberBuilder<UnixTimestampMillis> =>
    this.integer()
      .branded<UnixTimestampMillis>()
      .format('unixTimestampMillis2000')
      .description('UnixTimestampMillis2000')

  utcOffset = (): this => this.format('utcOffset')
  utcOffsetHours = (): this => this.format('utcOffsetHours')

  branded<B extends number>(): JsonSchemaNumberBuilder<B> {
    return this as unknown as JsonSchemaNumberBuilder<B>
  }
}

export class JsonSchemaStringBuilder<
  T extends string = string,
  Opt extends boolean = false,
> extends JsonSchemaAnyBuilder<T, JsonSchemaString<T>, Opt> {
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

  format(format: string): this {
    Object.assign(this.schema, { format })
    return this
  }

  email = (): this => this.format('email')
  url = (): this => this.format('url')
  ipv4 = (): this => this.format('ipv4')
  ipv6 = (): this => this.format('ipv6')
  password = (): this => this.format('password')
  id = (): this => this.format('id')
  slug = (): this => this.format('slug')
  semVer = (): this => this.format('semVer')
  languageTag = (): this => this.format('languageTag')
  countryCode = (): this => this.format('countryCode')
  currency = (): this => this.format('currency')

  trim = (trim = true): this => this.transformModify('trim', trim)
  toLowerCase = (toLowerCase = true): this => this.transformModify('toLowerCase', toLowerCase)
  toUpperCase = (toUpperCase = true): this => this.transformModify('toUpperCase', toUpperCase)

  branded<B extends string>(): JsonSchemaStringBuilder<B> {
    return this as unknown as JsonSchemaStringBuilder<B>
  }

  /**
   * Accepts only the `YYYY-MM-DD` shape from all ISO 8601 variants.
   */
  isoDate(): JsonSchemaStringBuilder<IsoDate> {
    return this.format('IsoDate').branded<IsoDate>().description('IsoDate')
  }

  /**
   * Accepts strings that start with the `YYYY-MM-DDTHH:MM:SS` shape
   * and optionally end with either a `Z` or a `+/-hh:mm` timezone part.
   */
  isoDateTime(): JsonSchemaStringBuilder<IsoDateTime> {
    return this.format('IsoDateTime').branded<IsoDateTime>().description('IsoDateTime')
  }

  jwt(): this {
    return this.regex(JWT_REGEX)
  }

  private transformModify(t: 'trim' | 'toLowerCase' | 'toUpperCase', add: boolean): this {
    if (add) {
      this.schema.transform = _uniq([...(this.schema.transform || []), t])
    } else {
      this.schema.transform = this.schema.transform?.filter(s => s !== t)
    }
    return this
  }

  // contentMediaType?: string
  // contentEncoding?: string
}

export class JsonSchemaObjectBuilder<
  T extends AnyObject,
  Opt extends boolean = false,
> extends JsonSchemaAnyBuilder<T, JsonSchemaObject<T>, Opt> {
  constructor() {
    super({
      type: 'object',
      properties: {} as T,
      required: [],
      additionalProperties: false,
    })
  }

  addProperties(props: { [k in keyof T]: JsonSchemaBuilder<T[k]> }): this {
    Object.entries(props).forEach(([k, builder]: [keyof T, JsonSchemaBuilder]) => {
      const schema = builder.build()
      if (!schema.optionalField) {
        this.schema.required.push(k)
      } else {
        schema.optionalField = undefined
      }
      this.schema.properties[k] = schema
    })

    this.required(this.schema.required) // ensure it's sorted and _uniq

    return this
  }

  /**
   * Ensures `required` is always sorted and _uniq
   */
  required(required: (keyof T)[]): this {
    Object.assign(this.schema, { required })
    this.schema.required = _uniq(required).sort()
    return this
  }

  addRequired(required: (keyof T)[]): this {
    return this.required([...this.schema.required, ...required])
  }

  minProps(minProperties: number): this {
    Object.assign(this.schema, { minProperties })
    return this
  }

  maxProps(maxProperties: number): this {
    Object.assign(this.schema, { maxProperties })
    return this
  }

  additionalProps(additionalProperties: boolean): this {
    Object.assign(this.schema, { additionalProperties })
    return this
  }

  baseDBEntity(): JsonSchemaObjectBuilder<T & BaseDBEntity> {
    Object.assign(this.schema.properties, {
      id: { type: 'string' },
      created: { type: 'number', format: 'unixTimestamp2000' },
      updated: { type: 'number', format: 'unixTimestamp2000' },
    })

    return this.addRequired(['id', 'created', 'updated']) as any
  }

  extend<T2 extends AnyObject>(
    s2: JsonSchemaObjectBuilder<T2>,
  ): JsonSchemaObjectBuilder<T & T2 extends infer O ? { [K in keyof O]: O[K] } : never> {
    const builder = new JsonSchemaObjectBuilder<any>()
    Object.assign(builder.schema, _deepCopy(this.schema))
    mergeJsonSchemaObjects(builder.schema, s2.schema)
    return builder
  }
}

export class JsonSchemaArrayBuilder<ITEM, Opt extends boolean = false> extends JsonSchemaAnyBuilder<
  ITEM[],
  JsonSchemaArray<ITEM>,
  Opt
> {
  constructor(itemsSchema: JsonSchemaBuilder<ITEM>) {
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

export class JsonSchemaTupleBuilder<T extends any[]> extends JsonSchemaAnyBuilder<
  T,
  JsonSchemaTuple<T>
> {
  constructor(items: JsonSchemaBuilder[]) {
    super({
      type: 'array',
      items: items.map(b => b.build()),
      minItems: items.length,
      maxItems: items.length,
    })
  }
}

function object<P extends Record<string, JsonSchemaAnyBuilder<any, any, any>>>(
  props: P,
): JsonSchemaObjectBuilder<
  {
    [K in keyof P as P[K] extends JsonSchemaAnyBuilder<any, any, infer Opt>
      ? Opt extends true
        ? never
        : K
      : never]: P[K] extends JsonSchemaAnyBuilder<infer U, any, any> ? U : never
  } & {
    [K in keyof P as P[K] extends JsonSchemaAnyBuilder<any, any, infer Opt>
      ? Opt extends true
        ? K
        : never
      : never]?: P[K] extends JsonSchemaAnyBuilder<infer U, any, any> ? U : never
  } extends infer O
    ? { [K in keyof O]: O[K] }
    : never
>
function object<T extends AnyObject>(props: {
  [K in keyof T]: JsonSchemaAnyBuilder<T[K]>
}): JsonSchemaObjectBuilder<T>

function object(props: any): any {
  return new JsonSchemaObjectBuilder<any>().addProperties(props)
}
