/* eslint-disable id-denylist */

import { _uniq } from '../array/array.util.js'
import { _deepCopy } from '../object/object.util.js'
import type { Set2 } from '../object/set2.js'
import { _sortObject } from '../object/sortObject.js'
import type { AnyObject } from '../types.js'
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
    return this
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
}

export class JsonSchemaObjectBuilder2<
  PROPS extends Record<string, JsonSchemaAnyBuilder2<any, any, any>>,
  Opt extends boolean = false,
> extends JsonSchemaAnyBuilder2<
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
  },
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

export interface JsonSchema2<IN = unknown, OUT = IN> {
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
