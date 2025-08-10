import type { AnyObject, StringMap } from '../types.js'

export type JsonSchema<T = unknown> =
  | JsonSchemaAny<T>
  | JsonSchemaOneOf<T>
  | JsonSchemaAllOf<T>
  | JsonSchemaAnyOf<T>
  | JsonSchemaNot<T>
  | JsonSchemaRef<T>
  | JsonSchemaConst<T>
  | JsonSchemaEnum<T>
  | JsonSchemaString
  | JsonSchemaNumber
  | JsonSchemaBoolean
  | JsonSchemaNull
  | JsonSchemaObject // cannot use <T>, because T needs to extend AnyObject
  | JsonSchemaArray<T>
  | JsonSchemaTuple<T>

export interface JsonSchemaAny<T = unknown> {
  $schema?: string
  $id?: string
  title?: string
  description?: string
  // $comment?: string
  // nullable?: boolean // not sure about that field
  deprecated?: boolean
  readOnly?: boolean
  writeOnly?: boolean

  type?: string

  default?: T

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
}

/**
 * Union type
 */
export interface JsonSchemaOneOf<T = unknown> extends JsonSchemaAny<T> {
  oneOf: JsonSchema[]
}

/**
 * Intersection type
 */
export interface JsonSchemaAllOf<T = unknown> extends JsonSchemaAny<T> {
  allOf: JsonSchema[]
}

export interface JsonSchemaAnyOf<T = unknown> extends JsonSchemaAny<T> {
  anyOf: JsonSchema[]
}

export interface JsonSchemaNot<T = unknown> extends JsonSchemaAny<T> {
  not: JsonSchema
}

// Trying to loosen the type restrictions, to make things simpler. To be monitored!
// export interface JsonSchemaConst<T extends string | number | boolean = any>
export interface JsonSchemaConst<T = unknown> extends JsonSchemaAny<T> {
  const: T // literal type
}

export interface JsonSchemaString<T extends string = string> extends JsonSchemaAny<T> {
  type: 'string'
  pattern?: string
  minLength?: number
  maxLength?: number
  format?: string

  contentMediaType?: string
  contentEncoding?: string // e.g 'base64'

  /**
   * https://ajv.js.org/packages/ajv-keywords.html#transform
   */
  transform?: ('trim' | 'toLowerCase' | 'toUpperCase')[]
}

export interface JsonSchemaNumber<T extends number = number> extends JsonSchemaAny<T> {
  type: 'number' | 'integer'
  format?: string
  multipleOf?: number
  minimum?: number
  exclusiveMinimum?: number
  maximum?: number
  exclusiveMaximum?: number
}

export interface JsonSchemaBoolean extends JsonSchemaAny<boolean> {
  type: 'boolean'
}

export interface JsonSchemaNull extends JsonSchemaAny<null> {
  type: 'null'
}

// export interface JsonSchemaEnum<T extends string | number = any> extends JsonSchemaAny<T> {
export interface JsonSchemaEnum<T = unknown> extends JsonSchemaAny<T> {
  enum: T[]
}

export interface JsonSchemaRef<T = unknown> extends JsonSchemaAny<T> {
  $ref: string
}

export interface JsonSchemaRootObject<T extends AnyObject = AnyObject> extends JsonSchemaObject<T> {
  $id: string
}

export interface JsonSchemaObject<T extends AnyObject = AnyObject> extends JsonSchemaAny<T> {
  type: 'object'
  // let's be strict and require all these
  properties: {
    [k in keyof T]: JsonSchema
  }
  required: (keyof T)[]
  additionalProperties: boolean
  minProperties?: number
  maxProperties?: number

  // StringMap
  patternProperties?: StringMap<JsonSchema>
  propertyNames?: JsonSchema

  /**
   * @example
   *
   * dependentRequired: {
   *   credit_card: ['billing_address']
   * }
   */
  dependentRequired?: StringMap<string[]>

  dependentSchemas?: StringMap<JsonSchema>

  dependencies?: StringMap<string[]>
}

export interface JsonSchemaArray<ITEM = unknown> extends JsonSchemaAny<ITEM[]> {
  type: 'array'
  items: JsonSchema<ITEM>
  minItems?: number
  maxItems?: number
  uniqueItems?: boolean
}

export interface JsonSchemaTuple<T = unknown> extends JsonSchemaAny<T> {
  type: 'array'
  items: JsonSchema[]
  minItems: number
  maxItems: number
}
