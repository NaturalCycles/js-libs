import { _uniq } from '../array/array.util.js'
import { _deepCopy } from '../object/object.util.js'
import { _sortObject } from '../object/sortObject.js'
import type { AnyObject, BaseDBEntity, Branded, IsoDate, UnixTimestamp } from '../types.js'
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
  const<T = unknown>(value: T) {
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
  enum<T = unknown>(enumValues: T[]) {
    return new JsonSchemaAnyBuilder<T, JsonSchemaEnum<T>>({ enum: enumValues })
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
  unixTimestamp() {
    return new JsonSchemaNumberBuilder<UnixTimestamp>().unixTimestamp()
  },
  unixTimestamp2000() {
    return new JsonSchemaNumberBuilder<UnixTimestamp>().unixTimestamp2000()
  },
  // string types
  string<T extends string = string>() {
    return new JsonSchemaStringBuilder<T>()
  },
  isoDate() {
    return new JsonSchemaStringBuilder<IsoDate>().isoDate()
  },
  // email: () => new JsonSchemaStringBuilder().email(),
  // complex types
  object,
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
  oneOf<T = unknown>(items: JsonSchemaAnyBuilder[]) {
    return new JsonSchemaAnyBuilder<T, JsonSchemaOneOf<T>>({
      oneOf: items.map(b => b.build()),
    })
  },
  allOf<T = unknown>(items: JsonSchemaAnyBuilder[]) {
    return new JsonSchemaAnyBuilder<T, JsonSchemaAllOf<T>>({
      allOf: items.map(b => b.build()),
    })
  },
}

export class JsonSchemaAnyBuilder<T = unknown, SCHEMA_TYPE extends JsonSchema<T> = JsonSchema<T>>
  implements JsonSchemaBuilder<T>
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

  oneOf(schemas: JsonSchema[]): this {
    Object.assign(this.schema, { oneOf: schemas })
    return this
  }

  allOf(schemas: JsonSchema[]): this {
    Object.assign(this.schema, { allOf: schemas })
    return this
  }

  instanceof(of: string): this {
    this.schema.instanceof = of
    return this
  }

  optional(): JsonSchemaAnyBuilder<T | undefined, JsonSchema<T | undefined>>
  optional(optional: true): JsonSchemaAnyBuilder<T | undefined, JsonSchema<T | undefined>>
  optional(
    optional: false,
  ): JsonSchemaAnyBuilder<Exclude<T, undefined>, JsonSchema<Exclude<T, undefined>>>
  optional(optional?: boolean): JsonSchemaAnyBuilder<any, JsonSchema<any>> {
    if (optional) {
      this.schema.optionalField = true
    } else {
      this.schema.optionalField = undefined
    }
    return this as any
  }

  /**
   * Produces a "clean schema object" without methods.
   * Same as if it would be JSON.stringified.
   */
  build(): SCHEMA_TYPE {
    return _sortObject(JSON.parse(JSON.stringify(this.schema)), JSON_SCHEMA_ORDER)
  }

  clone(): JsonSchemaAnyBuilder<T, SCHEMA_TYPE> {
    return new JsonSchemaAnyBuilder<T, SCHEMA_TYPE>(_deepCopy(this.schema))
  }

  /**
   * @experimental
   */
  infer!: T
}

export class JsonSchemaNumberBuilder<T extends number = number> extends JsonSchemaAnyBuilder<
  T,
  JsonSchemaNumber<T>
> {
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
  unixTimestamp = (): this => this.format('unixTimestamp').description('UnixTimestamp')
  unixTimestamp2000 = (): this => this.format('unixTimestamp2000').description('UnixTimestamp2000')
  unixTimestampMillis = (): this =>
    this.format('unixTimestampMillis').description('UnixTimestampMillis')

  unixTimestampMillis2000 = (): this =>
    this.format('unixTimestampMillis2000').description('UnixTimestampMillis2000')

  utcOffset = (): this => this.format('utcOffset')
  utcOffsetHours = (): this => this.format('utcOffsetHours')

  branded<B extends number>(): JsonSchemaNumberBuilder<B> {
    return this as unknown as JsonSchemaNumberBuilder<B>
  }
}

export class JsonSchemaStringBuilder<T extends string = string> extends JsonSchemaAnyBuilder<
  T,
  JsonSchemaString<T>
> {
  constructor() {
    super({
      type: 'string',
    })
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
  isoDate = (): this => this.format('date').description('IsoDate') // todo: make it custom isoDate instead
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

export class JsonSchemaObjectBuilder<T extends AnyObject> extends JsonSchemaAnyBuilder<
  T,
  JsonSchemaObject<T>
> {
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

  extend<T2 extends AnyObject>(s2: JsonSchemaObjectBuilder<T2>): JsonSchemaObjectBuilder<T & T2> {
    const builder = new JsonSchemaObjectBuilder<T & T2>()
    Object.assign(builder.schema, _deepCopy(this.schema))
    mergeJsonSchemaObjects(builder.schema, s2.schema)
    return builder
  }
}

export class JsonSchemaArrayBuilder<ITEM> extends JsonSchemaAnyBuilder<
  ITEM[],
  JsonSchemaArray<ITEM>
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

// TODO and Notes
// The issue is that in `j` we mix two approaches:
// 1) the builder driven approach
// 2) the type driven approach.

function object<P extends Record<string, JsonSchemaAnyBuilder<any, any>>>(
  props: P,
): JsonSchemaObjectBuilder<{
  [K in keyof P]: P[K] extends JsonSchemaAnyBuilder<infer U, any> ? U : never
}>
function object<T extends AnyObject>(props: {
  [K in keyof T]: JsonSchemaAnyBuilder<T[K]>
}): JsonSchemaObjectBuilder<T>

function object(props: any): any {
  return new JsonSchemaObjectBuilder<any>().addProperties(props)
}
