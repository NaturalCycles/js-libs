/* eslint-disable id-denylist */

import { _uniq } from 'array/array.util.js'
import { _deepCopy } from 'object/object.util.js'
import type { Set2 } from 'object/set2.js'
import { _sortObject } from 'object/sortObject.js'
import type { AnyObject } from 'types.js'
import { JSON_SCHEMA_ORDER } from './jsonSchema.cnst.js'

export const j2 = {
  string(): JsonSchemaStringBuilder<string, string, false> {
    return new JsonSchemaStringBuilder()
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

export class JsonSchemaAnyBuilder<IN, OUT, Opt> {
  constructor(protected schema: JsonSchema) {}

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
    return this
  }

  nullable(): JsonSchemaAnyBuilder<IN | null, OUT | null, Opt> {
    return new (this.constructor as any)({
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
}

export class JsonSchemaObjectBuilder<
  PROPS extends Record<string, JsonSchemaAnyBuilder<any, any, any>>,
  Opt extends boolean = false,
> extends JsonSchemaAnyBuilder<
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
  },
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
  },
  Opt
> {
  constructor(private props?: PROPS) {
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
      if (!schema.optionalField) required.push(key)
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
  IN[] | Set2<IN>,
  Set2<OUT>,
  Opt
> {
  constructor(itemsSchema: JsonSchemaAnyBuilder<IN, OUT, Opt>) {
    super({
      type: ['array', 'object'],
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
}

export interface JsonSchema<IN = unknown, OUT = IN> {
  readonly in?: IN
  readonly out?: OUT

  $schema?: AnyObject
  $id?: string
  title?: string
  description?: string
  // $comment?: string
  // nullable?: boolean // not sure about that field
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

  /**
   * https://ajv.js.org/packages/ajv-keywords.html#instanceof
   *
   * Useful for Node.js Buffer, you can use it like:
   * `instanceof: 'Buffer'`
   */
  instanceof?: string | string[]

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

  transform?: { trim?: true; toLowerCase?: true; toUpperCase?: true; truncate?: number }
}
