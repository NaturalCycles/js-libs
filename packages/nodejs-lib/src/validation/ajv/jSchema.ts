/* eslint-disable id-denylist */
// oxlint-disable max-lines

import type { ValidationFunction, ValidationFunctionResult } from '@naturalcycles/js-lib'
import {
  _isObject,
  _isUndefined,
  _numberEnumValues,
  _stringEnumValues,
  getEnumType,
} from '@naturalcycles/js-lib'
import { _uniq } from '@naturalcycles/js-lib/array'
import { _assert, _try } from '@naturalcycles/js-lib/error'
import type { Set2 } from '@naturalcycles/js-lib/object'
import { _deepCopy, _filterNullishValues, _sortObject } from '@naturalcycles/js-lib/object'
import { _substringBefore } from '@naturalcycles/js-lib/string'
import type {
  AnyObject,
  BaseDBEntity,
  IANATimezone,
  Inclusiveness,
  IsoDate,
  IsoDateTime,
  IsoMonth,
  NumberEnum,
  StringEnum,
  StringMap,
  UnixTimestamp,
  UnixTimestampMillis,
} from '@naturalcycles/js-lib/types'
import { _objectAssign, _typeCast, JWT_REGEX } from '@naturalcycles/js-lib/types'
import type { StandardJSONSchemaV1, StandardSchemaV1 } from '@standard-schema/spec'
import type { Ajv, ErrorObject } from 'ajv'
import { _inspect } from '../../string/inspect.js'
import {
  BASE64URL_REGEX,
  COUNTRY_CODE_REGEX,
  CURRENCY_REGEX,
  IPV4_REGEX,
  IPV6_REGEX,
  LANGUAGE_TAG_REGEX,
  SEMVER_REGEX,
  SLUG_REGEX,
  URL_REGEX,
  UUID_REGEX,
} from '../regexes.js'
import { TIMEZONES } from '../timezones.js'
import { AjvValidationError } from './ajvValidationError.js'
import { getAjv } from './getAjv.js'
import {
  isEveryItemNumber,
  isEveryItemPrimitive,
  isEveryItemString,
  JSON_SCHEMA_ORDER,
  mergeJsonSchemaObjects,
} from './jsonSchemaBuilder.util.js'

// ==== j (factory object) ====

export const j = {
  /**
   * Matches literally any value - equivalent to TypeScript's `any` type.
   * Use sparingly, as it bypasses type validation entirely.
   */
  any(): JBuilder<any, false> {
    return new JBuilder({})
  },

  string(): JString<string, false> {
    return new JString()
  },

  number(): JNumber<number, false> {
    return new JNumber()
  },

  boolean(): JBoolean<boolean, false> {
    return new JBoolean()
  },

  object: Object.assign(object, {
    dbEntity: objectDbEntity,
    infer: objectInfer,
    any() {
      return j.object<AnyObject>({}).allowAdditionalProperties()
    },

    stringMap<S extends JSchema<any, any>>(schema: S): JObject<StringMap<SchemaOut<S>>> {
      const isValueOptional = schema.getSchema().optionalField
      const builtSchema = schema.build()
      const finalValueSchema: JsonSchema = isValueOptional
        ? { anyOf: [{ isUndefined: true }, builtSchema] }
        : builtSchema

      return new JObject<StringMap<SchemaOut<S>>>(
        {},
        {
          hasIsOfTypeCheck: false,
          patternProperties: {
            '^.+$': finalValueSchema,
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

  array<OUT, Opt>(itemSchema: JSchema<OUT, Opt>): JArray<OUT, Opt> {
    return new JArray(itemSchema)
  },

  tuple<const S extends JSchema<any, any>[]>(items: S): JTuple<S> {
    return new JTuple<S>(items)
  },

  set<OUT, Opt>(itemSchema: JSchema<OUT, Opt>): JSet2Builder<OUT, Opt> {
    return new JSet2Builder(itemSchema)
  },

  buffer(): JBuilder<Buffer, false> {
    return new JBuilder<Buffer, false>({
      Buffer: true,
    })
  },

  enum<const T extends readonly (string | number | boolean | null)[] | StringEnum | NumberEnum>(
    input: T,
    opt?: JsonBuilderRuleOpt,
  ): JEnum<
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
    return new JEnum(enumValues as any, baseType, opt)
  },

  /**
   * Use only with primitive values, otherwise this function will throw to avoid bugs.
   * To validate objects, use `anyOfBy`.
   *
   * Our Ajv is configured to strip unexpected properties from objects,
   * and since Ajv is mutating the input, this means that it cannot
   * properly validate the same data over multiple schemas.
   *
   * Use `anyOf` when schemas may overlap (e.g., AccountId | PartnerId with same format).
   * Use `oneOf` when schemas are mutually exclusive.
   */
  oneOf<B extends readonly JSchema<any, boolean>[], OUT = BuilderOutUnion<B>>(
    items: [...B],
  ): JBuilder<OUT, false> {
    const schemas = items.map(b => b.build())
    _assert(
      schemas.every(hasNoObjectSchemas),
      'Do not use `oneOf` validation with non-primitive types!',
    )

    return new JBuilder<OUT, false>({
      oneOf: schemas,
    })
  },

  /**
   * Use only with primitive values, otherwise this function will throw to avoid bugs.
   * To validate objects, use `anyOfBy` or `anyOfThese`.
   *
   * Our Ajv is configured to strip unexpected properties from objects,
   * and since Ajv is mutating the input, this means that it cannot
   * properly validate the same data over multiple schemas.
   *
   * Use `anyOf` when schemas may overlap (e.g., AccountId | PartnerId with same format).
   * Use `oneOf` when schemas are mutually exclusive.
   */
  anyOf<B extends readonly JSchema<any, boolean>[], OUT = BuilderOutUnion<B>>(
    items: [...B],
  ): JBuilder<OUT, false> {
    const schemas = items.map(b => b.build())
    _assert(
      schemas.every(hasNoObjectSchemas),
      'Do not use `anyOf` validation with non-primitive types!',
    )

    return new JBuilder<OUT, false>({
      anyOf: schemas,
    })
  },

  /**
   * Pick validation schema for an object based on the value of a specific property.
   *
   * ```
   * const schemaMap = {
   *   true: successSchema,
   *   false: errorSchema
   * }
   *
   * const schema = j.anyOfBy('success', schemaMap)
   * ```
   */
  anyOfBy<D extends Record<PropertyKey, JSchema<any, any>>, OUT = AnyOfByOut<D>>(
    propertyName: string,
    schemaDictionary: D,
  ): JBuilder<OUT, false> {
    const builtSchemaDictionary: Record<string, JsonSchema> = {}
    for (const [key, schema] of Object.entries(schemaDictionary)) {
      builtSchemaDictionary[key] = schema.build()
    }

    return new JBuilder<OUT, false>({
      type: 'object',
      hasIsOfTypeCheck: true,
      anyOfBy: {
        propertyName,
        schemaDictionary: builtSchemaDictionary,
      },
    })
  },

  /**
   * Custom version of `anyOf` which - in contrast to the original function - does not mutate the input.
   * This comes with a performance penalty, so do not use it where performance matters.
   *
   * ```
   * const schema = j.anyOfThese([successSchema, errorSchema])
   * ```
   */
  anyOfThese<B extends readonly JSchema<any, boolean>[], OUT = BuilderOutUnion<B>>(
    items: [...B],
  ): JBuilder<OUT, false> {
    return new JBuilder<OUT, false>({
      anyOfThese: items.map(b => b.build()),
    })
  },

  and() {
    return {
      silentBob: () => {
        throw new Error('...strike back!')
      },
    }
  },

  literal<const V extends string | number | boolean | null>(v: V) {
    let baseType: EnumBaseType = 'other'
    if (typeof v === 'string') baseType = 'string'
    if (typeof v === 'number') baseType = 'number'
    return new JEnum<V>([v], baseType)
  },

  /**
   * Create a JSchema from a plain JsonSchema object.
   * Useful when the schema is loaded from a JSON file or generated externally.
   *
   * Optionally accepts a custom Ajv instance and/or inputName for error messages.
   */
  fromSchema<OUT>(
    schema: JsonSchema<OUT>,
    cfg?: { ajv?: Ajv; inputName?: string },
  ): JSchema<OUT, false> {
    return new JSchema<OUT, false>(schema, cfg)
  },
}

// ==== Symbol for caching compiled AjvSchema ====

export const HIDDEN_AJV_SCHEMA = Symbol('HIDDEN_AJV_SCHEMA')

export type WithCachedAjvSchema<Base, OUT> = Base & {
  [HIDDEN_AJV_SCHEMA]: AjvSchema<OUT>
}

// ==== JSchema (locked base) ====

/*
  Notes for future reference

  Q: Why do we need `Opt` - when `IN` and `OUT` already carries the `| undefined`?
  A: Because of objects. Without `Opt`, an optional field would be inferred as `{ foo: string | undefined }`,
     which means that the `foo` property would be mandatory, it's just that its value can be `undefined` as well.
     With `Opt`, we can infer it as `{ foo?: string | undefined }`.
*/

export class JSchema<OUT, Opt>
  implements StandardSchemaV1<unknown, OUT>, StandardJSONSchemaV1<unknown, OUT>
{
  protected [HIDDEN_AJV_SCHEMA]: AjvSchema<any> | undefined
  protected schema: JsonSchema
  private _cfg?: { ajv?: Ajv; inputName?: string }

  constructor(schema: JsonSchema, cfg?: { ajv?: Ajv; inputName?: string }) {
    this.schema = schema
    this._cfg = cfg
  }

  private _builtSchema?: JsonSchema
  private _compiledFns?: WeakMap<Ajv, any>

  private _getBuiltSchema(): JsonSchema {
    if (!this._builtSchema) {
      const builtSchema = this.build()

      if (this instanceof JBuilder) {
        _assert(
          builtSchema.type !== 'object' || builtSchema.hasIsOfTypeCheck,
          'The schema must be type checked against a type or interface, using the `.isOfType()` helper in `j`.',
        )
      }

      delete builtSchema.optionalField
      this._builtSchema = builtSchema
    }

    return this._builtSchema
  }

  private _getCompiled(overrideAjv?: Ajv): { fn: any; builtSchema: JsonSchema } {
    const builtSchema = this._getBuiltSchema()
    const ajv = overrideAjv ?? this._cfg?.ajv ?? getAjv()

    this._compiledFns ??= new WeakMap()
    let fn = this._compiledFns.get(ajv)
    if (!fn) {
      fn = ajv.compile(builtSchema as any)
      this._compiledFns.set(ajv, fn)

      // Cache AjvSchema wrapper for HIDDEN_AJV_SCHEMA backward compat (default ajv only)
      if (!overrideAjv) {
        this[HIDDEN_AJV_SCHEMA] = AjvSchema._wrap<any>(builtSchema, fn)
      }
    }

    return { fn, builtSchema }
  }

  getSchema(): JsonSchema {
    return this.schema
  }

  /**
   * Produces a "clean schema object" without methods.
   * Same as if it would be JSON.stringified.
   */
  build(): JsonSchema<OUT> {
    _assert(
      !(this.schema.optionalField && this.schema.default !== undefined),
      '.optional() and .default() should not be used together - the default value makes .optional() redundant and causes incorrect type inference',
    )

    const jsonSchema = _sortObject(
      deepCopyPreservingFunctions(this.schema) as AnyObject,
      JSON_SCHEMA_ORDER,
    ) as JsonSchema<OUT>

    delete jsonSchema.optionalField

    return jsonSchema
  }

  clone(): this {
    const cloned = Object.create(Object.getPrototypeOf(this))
    cloned.schema = deepCopyPreservingFunctions(this.schema)
    cloned._cfg = this._cfg
    return cloned
  }

  cloneAndUpdateSchema(schema: Partial<JsonSchema>): this {
    const clone = this.clone()
    _objectAssign(clone.schema, schema)
    return clone
  }

  get ['~standard'](): StandardSchemaV1.Props<unknown, OUT> &
    StandardJSONSchemaV1.Props<unknown, OUT> {
    const value: StandardSchemaV1.Props<unknown, OUT> & StandardJSONSchemaV1.Props<unknown, OUT> = {
      version: 1,
      vendor: 'j',
      validate: v => {
        const [err, output] = this.getValidationResult(v)
        if (err) {
          // todo: make getValidationResult return issues with path, so we can pass the path here too
          return { issues: [{ message: err.message }] }
        }
        return { value: output }
      },
      jsonSchema: {
        input: () => this.build() as Record<string, unknown>,
        output: () => this.build() as Record<string, unknown>,
      },
    }
    Object.defineProperty(this, '~standard', { value })
    return value
  }

  validate(input: unknown, opt?: AjvValidationOptions): OUT {
    const [err, output] = this.getValidationResult(input, opt)
    if (err) throw err
    return output
  }

  isValid(input: unknown, opt?: AjvValidationOptions): boolean {
    const [err] = this.getValidationResult(input, opt)
    return !err
  }

  getValidationResult(
    input: unknown,
    opt: AjvValidationOptions = {},
  ): ValidationFunctionResult<OUT, AjvValidationError> {
    const { fn, builtSchema } = this._getCompiled(opt.ajv)
    const inputName =
      this._cfg?.inputName || (builtSchema.$id ? _substringBefore(builtSchema.$id, '.') : undefined)
    return executeValidation<OUT>(fn, builtSchema, input, opt, inputName)
  }

  getValidationFunction(
    opt: AjvValidationOptions = {},
  ): ValidationFunction<OUT, AjvValidationError> {
    return (input, opt2) => {
      return this.getValidationResult(input, {
        ajv: opt.ajv,
        mutateInput: opt2?.mutateInput ?? opt.mutateInput,
        inputName: opt2?.inputName ?? opt.inputName,
        inputId: opt2?.inputId ?? opt.inputId,
      })
    }
  }

  /**
   * Specify a function to be called after the normal validation is finished.
   *
   * This function will receive the validated, type-safe data, and you can use it
   * to do further validations, e.g. conditional validations based on certain property values,
   * or to do data modifications either by mutating the input or returning a new value.
   *
   * If you throw an error from this function, it will show up as an error in the validation.
   */
  postValidation<OUT2 = OUT>(fn: PostValidatonFn<OUT, OUT2>): JSchema<OUT2, Opt> {
    const clone = this.cloneAndUpdateSchema({
      postValidation: fn,
    })
    return clone as unknown as JSchema<OUT2, Opt>
  }

  /**
   * @experimental
   */
  out!: OUT
  opt!: Opt

  /** Forces OUT to be invariant (prevents covariant subtype matching in object property constraints). */
  declare protected _invariantOut: (x: OUT) => void
}

// ==== JBuilder (chainable base) ====

export class JBuilder<OUT, Opt> extends JSchema<OUT, Opt> {
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
   */
  isOfType<ExpectedType>(): ExactMatch<ExpectedType, OUT> extends true ? this : never {
    return this.cloneAndUpdateSchema({ hasIsOfTypeCheck: true }) as any
  }

  $schema($schema: string): this {
    return this.cloneAndUpdateSchema({ $schema })
  }

  $schemaDraft7(): this {
    return this.$schema('http://json-schema.org/draft-07/schema#')
  }

  $id($id: string): this {
    return this.cloneAndUpdateSchema({ $id })
  }

  title(title: string): this {
    return this.cloneAndUpdateSchema({ title })
  }

  description(description: string): this {
    return this.cloneAndUpdateSchema({ description })
  }

  deprecated(deprecated = true): this {
    return this.cloneAndUpdateSchema({ deprecated })
  }

  type(type: string): this {
    return this.cloneAndUpdateSchema({ type })
  }

  default(v: any): this {
    return this.cloneAndUpdateSchema({ default: v })
  }

  instanceof(of: string): this {
    return this.cloneAndUpdateSchema({ type: 'object', instanceof: of })
  }

  /**
   * @param optionalValues List of values that should be considered/converted as `undefined`.
   *
   * This `optionalValues` feature only works when the current schema is nested in an object or array schema,
   * due to how mutability works in Ajv.
   *
   * Make sure this `optional()` call is at the end of your call chain.
   *
   * When `null` is included in optionalValues, the return type becomes `JSchema`
   * (no further chaining allowed) because the schema is wrapped in an anyOf structure.
   */
  optional<T extends readonly (string | number | boolean | null)[] | undefined = undefined>(
    optionalValues?: T,
  ): T extends readonly (string | number | boolean | null)[]
    ? JSchema<OUT | undefined, true>
    : JBuilder<OUT | undefined, true> {
    if (!optionalValues?.length) {
      const clone = this.cloneAndUpdateSchema({ optionalField: true })
      return clone as any
    }

    const builtSchema = this.build()

    // When optionalValues is just [null], use a simple null-wrapping structure.
    // If the schema already has anyOf with a null branch (from nullable()),
    // inject optionalValues directly into it.
    if (optionalValues.length === 1 && optionalValues[0] === null) {
      if (builtSchema.anyOf) {
        const nullBranch = builtSchema.anyOf.find(b => b.type === 'null')
        if (nullBranch) {
          nullBranch.optionalValues = [null]
          return new JSchema({ ...builtSchema, optionalField: true }) as any
        }
      }

      // Wrap with null type branch
      return new JSchema({
        anyOf: [{ type: 'null', optionalValues: [null] }, builtSchema],
        optionalField: true,
      }) as any
    }

    // General case: create anyOf with current schema + alternatives.
    // Preserve the original type for Ajv strict mode (optionalValues keyword requires a type).
    const alternativesSchema = j.enum(optionalValues).build()
    const innerSchema: JsonSchema = {
      ...(builtSchema.type ? { type: builtSchema.type } : {}),
      anyOf: [builtSchema, alternativesSchema],
      optionalValues: [...optionalValues],
    }

    // When `null` is specified, we want `null` to be stripped and the value to become `undefined`,
    // so we must allow `null` values to be parsed by Ajv,
    // but the typing should not reflect that.
    if (optionalValues.includes(null)) {
      return new JSchema({
        anyOf: [{ type: 'null', optionalValues: [...optionalValues] }, innerSchema],
        optionalField: true,
      }) as any
    }

    return new JSchema({ ...innerSchema, optionalField: true }) as any
  }

  nullable(): JBuilder<OUT | null, Opt> {
    return new JBuilder({
      anyOf: [this.build(), { type: 'null' }],
    })
  }

  /**
   * @deprecated
   * The usage of this function is discouraged as it defeats the purpose of having type-safe validation.
   */
  castAs<T>(): JBuilder<T, Opt> {
    return this as unknown as JBuilder<T, Opt>
  }

  /**
   * Locks the given schema chain and no other modification can be done to it.
   */
  final(): JSchema<OUT, Opt> {
    return new JSchema<OUT, Opt>(this.schema)
  }

  /**
   *
   * @param validator A validator function that returns an error message or undefined.
   *
   * You may add multiple custom validators and they will be executed in the order you added them.
   */
  custom<OUT2 = OUT>(validator: CustomValidatorFn): JBuilder<OUT2, Opt> {
    const { customValidations = [] } = this.schema
    return this.cloneAndUpdateSchema({
      customValidations: [...customValidations, validator],
    }) as unknown as JBuilder<OUT2, Opt>
  }

  /**
   *
   * @param converter A converter function that returns a new value.
   *
   * You may add multiple converters and they will be executed in the order you added them,
   * each converter receiving the result from the previous one.
   *
   * This feature only works when the current schema is nested in an object or array schema,
   * due to how mutability works in Ajv.
   */
  convert<OUT2>(converter: CustomConverterFn<OUT2>): JBuilder<OUT2, Opt> {
    const { customConversions = [] } = this.schema
    return this.cloneAndUpdateSchema({
      customConversions: [...customConversions, converter],
    }) as unknown as JBuilder<OUT2, Opt>
  }
}

// ==== Consts

const TS_2500 = 16725225600 // 2500-01-01
const TS_2500_MILLIS = TS_2500 * 1000
const TS_2000 = 946684800 // 2000-01-01
const TS_2000_MILLIS = TS_2000 * 1000

// ==== Type-specific builders ====

export class JString<
  OUT extends string | undefined = string,
  Opt extends boolean = false,
> extends JBuilder<OUT, Opt> {
  constructor() {
    super({
      type: 'string',
    })
  }

  regex(pattern: RegExp, opt?: JsonBuilderRuleOpt): this {
    _assert(
      !pattern.flags,
      `Regex flags are not supported by JSON Schema. Received: /${pattern.source}/${pattern.flags}`,
    )
    return this.pattern(pattern.source, opt)
  }

  pattern(pattern: string, opt?: JsonBuilderRuleOpt): this {
    const clone = this.cloneAndUpdateSchema({ pattern })
    if (opt?.name) clone.setErrorMessage('pattern', `is not a valid ${opt.name}`)
    if (opt?.msg) clone.setErrorMessage('pattern', opt.msg)
    return clone
  }

  minLength(minLength: number): this {
    return this.cloneAndUpdateSchema({ minLength })
  }

  maxLength(maxLength: number): this {
    return this.cloneAndUpdateSchema({ maxLength })
  }

  length(exactLength: number): this
  length(minLength: number, maxLength: number): this
  length(minLengthOrExactLength: number, maxLength?: number): this {
    const maxLengthActual = maxLength ?? minLengthOrExactLength
    return this.minLength(minLengthOrExactLength).maxLength(maxLengthActual)
  }

  email(opt?: Partial<JsonSchemaStringEmailOptions>): this {
    const defaultOptions: JsonSchemaStringEmailOptions = { checkTLD: true }
    return this.cloneAndUpdateSchema({ email: { ...defaultOptions, ...opt } })
      .trim()
      .toLowerCase()
  }

  trim(): this {
    return this.cloneAndUpdateSchema({ transform: { ...this.schema.transform, trim: true } })
  }

  toLowerCase(): this {
    return this.cloneAndUpdateSchema({
      transform: { ...this.schema.transform, toLowerCase: true },
    })
  }

  toUpperCase(): this {
    return this.cloneAndUpdateSchema({
      transform: { ...this.schema.transform, toUpperCase: true },
    })
  }

  truncate(toLength: number): this {
    return this.cloneAndUpdateSchema({
      transform: { ...this.schema.transform, truncate: toLength },
    })
  }

  branded<B extends string>(): JString<B, Opt> {
    return this as unknown as JString<B, Opt>
  }

  /**
   * Validates that the input is a fully-specified YYYY-MM-DD formatted valid IsoDate value.
   *
   * All previous expectations in the schema chain are dropped - including `.optional()` -
   * because this call effectively starts a new schema chain.
   */
  isoDate(): JIsoDate {
    return new JIsoDate()
  }

  isoDateTime(): JString<IsoDateTime, Opt> {
    return this.cloneAndUpdateSchema({ IsoDateTime: true }).branded<IsoDateTime>()
  }

  isoMonth(): JBuilder<IsoMonth, false> {
    return new JBuilder<IsoMonth, false>({
      type: 'string',
      IsoMonth: {},
    })
  }

  /**
   * Validates the string format to be JWT.
   * Expects the JWT to be signed!
   */
  jwt(): this {
    return this.regex(JWT_REGEX, { msg: 'is not a valid JWT format' })
  }

  url(): this {
    return this.regex(URL_REGEX, { msg: 'is not a valid URL format' })
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
  ianaTimezone(): JEnum<IANATimezone, false> {
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

export class JIsoDate<Opt extends boolean = false> extends JBuilder<IsoDate, Opt> {
  constructor() {
    super({
      type: 'string',
      IsoDate: {},
    })
  }

  before(date: string): this {
    return this.cloneAndUpdateSchema({ IsoDate: { before: date } })
  }

  sameOrBefore(date: string): this {
    return this.cloneAndUpdateSchema({ IsoDate: { sameOrBefore: date } })
  }

  after(date: string): this {
    return this.cloneAndUpdateSchema({ IsoDate: { after: date } })
  }

  sameOrAfter(date: string): this {
    return this.cloneAndUpdateSchema({ IsoDate: { sameOrAfter: date } })
  }

  between(fromDate: string, toDate: string, incl: Inclusiveness): this {
    let schemaPatch: Partial<JsonSchema> = {}

    if (incl === '[)') {
      schemaPatch = { IsoDate: { sameOrAfter: fromDate, before: toDate } }
    } else if (incl === '[]') {
      schemaPatch = { IsoDate: { sameOrAfter: fromDate, sameOrBefore: toDate } }
    }

    return this.cloneAndUpdateSchema(schemaPatch)
  }
}

export interface JsonSchemaIsoDateOptions {
  before?: string
  sameOrBefore?: string
  after?: string
  sameOrAfter?: string
}

export interface JsonSchemaIsoMonthOptions {}

export class JNumber<
  OUT extends number | undefined = number,
  Opt extends boolean = false,
> extends JBuilder<OUT, Opt> {
  constructor() {
    super({
      type: 'number',
    })
  }

  integer(): this {
    return this.cloneAndUpdateSchema({ type: 'integer' })
  }

  branded<B extends number>(): JNumber<B, Opt> {
    return this as unknown as JNumber<B, Opt>
  }

  multipleOf(multipleOf: number): this {
    return this.cloneAndUpdateSchema({ multipleOf })
  }

  min(minimum: number): this {
    return this.cloneAndUpdateSchema({ minimum })
  }

  exclusiveMin(exclusiveMinimum: number): this {
    return this.cloneAndUpdateSchema({ exclusiveMinimum })
  }

  max(maximum: number): this {
    return this.cloneAndUpdateSchema({ maximum })
  }

  exclusiveMax(exclusiveMaximum: number): this {
    return this.cloneAndUpdateSchema({ exclusiveMaximum })
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

  unixTimestamp(): JNumber<UnixTimestamp, Opt> {
    return this.integer().min(0).max(TS_2500).branded<UnixTimestamp>()
  }

  unixTimestamp2000(): JNumber<UnixTimestamp, Opt> {
    return this.integer().min(TS_2000).max(TS_2500).branded<UnixTimestamp>()
  }

  unixTimestampMillis(): JNumber<UnixTimestampMillis, Opt> {
    return this.integer().min(0).max(TS_2500_MILLIS).branded<UnixTimestampMillis>()
  }

  unixTimestamp2000Millis(): JNumber<UnixTimestampMillis, Opt> {
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

  /**
   * Specify the precision of the floating point numbers by the number of digits after the ".".
   * Excess digits will be cut-off when the current schema is nested in an object or array schema,
   * due to how mutability works in Ajv.
   */
  precision(numberOfDigits: number): this {
    return this.cloneAndUpdateSchema({ precision: numberOfDigits })
  }
}

export class JBoolean<
  OUT extends boolean | undefined = boolean,
  Opt extends boolean = false,
> extends JBuilder<OUT, Opt> {
  constructor() {
    super({
      type: 'boolean',
    })
  }
}

export class JObject<OUT extends AnyObject, Opt extends boolean = false> extends JBuilder<
  OUT,
  Opt
> {
  constructor(props?: AnyObject, opt?: JObjectOpts) {
    super({
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
      hasIsOfTypeCheck: opt?.hasIsOfTypeCheck ?? true,
      patternProperties: opt?.patternProperties ?? undefined,
      keySchema: opt?.keySchema ?? undefined,
    })

    if (props) addPropertiesToSchema(this.schema, props)
  }

  /**
   * When set, the validation will not strip away properties that are not specified explicitly in the schema.
   */

  allowAdditionalProperties(): this {
    return this.cloneAndUpdateSchema({ additionalProperties: true })
  }

  extend<P extends Record<string, JSchema<any, any>>>(
    props: P,
  ): JObject<
    Override<
      OUT,
      {
        // required keys
        [K in keyof P as P[K] extends JSchema<any, infer IsOpt>
          ? IsOpt extends true
            ? never
            : K
          : never]: P[K] extends JSchema<infer OUT2, any> ? OUT2 : never
      } & {
        // optional keys
        [K in keyof P as P[K] extends JSchema<any, infer IsOpt>
          ? IsOpt extends true
            ? K
            : never
          : never]?: P[K] extends JSchema<infer OUT2, any> ? OUT2 : never
      }
    >,
    false
  > {
    const newBuilder = new JObject()
    _objectAssign(newBuilder.schema, deepCopyPreservingFunctions(this.schema))

    const incomingSchemaBuilder = new JObject(props)
    mergeJsonSchemaObjects(newBuilder.schema as any, incomingSchemaBuilder.schema as any)

    _objectAssign(newBuilder.schema, { hasIsOfTypeCheck: false })

    return newBuilder as any
  }

  /**
   * Concatenates another schema to the current schema.
   *
   * It expects you to use `isOfType<T>()` in the chain,
   * otherwise the validation will throw. This is to ensure
   * that the schemas you concatenated match the intended final type.
   */
  concat<OUT2 extends AnyObject>(other: JObject<OUT2, any>): JObject<OUT & OUT2, false> {
    const clone = this.clone()
    mergeJsonSchemaObjects(clone.schema as any, other.schema as any)
    _objectAssign(clone.schema, { hasIsOfTypeCheck: false })
    return clone as unknown as JObject<OUT & OUT2, false>
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
    return this.cloneAndUpdateSchema({ minProperties, minProperties2: minProperties })
  }

  maxProperties(maxProperties: number): this {
    return this.cloneAndUpdateSchema({ maxProperties })
  }

  exclusiveProperties(propNames: readonly (keyof OUT & string)[]): this {
    const exclusiveProperties = this.schema.exclusiveProperties ?? []
    return this.cloneAndUpdateSchema({ exclusiveProperties: [...exclusiveProperties, propNames] })
  }
}

interface JObjectOpts {
  hasIsOfTypeCheck?: false
  patternProperties?: StringMap<JsonSchema<any>>
  keySchema?: JsonSchema
}

export class JObjectInfer<
  PROPS extends Record<string, JSchema<any, any>>,
  Opt extends boolean = false,
> extends JBuilder<
  Expand<
    {
      [K in keyof PROPS as PROPS[K] extends JSchema<any, infer IsOpt>
        ? IsOpt extends true
          ? never
          : K
        : never]: PROPS[K] extends JSchema<infer OUT, any> ? OUT : never
    } & {
      [K in keyof PROPS as PROPS[K] extends JSchema<any, infer IsOpt>
        ? IsOpt extends true
          ? K
          : never
        : never]?: PROPS[K] extends JSchema<infer OUT, any> ? OUT : never
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

    if (props) addPropertiesToSchema(this.schema, props)
  }

  /**
   * When set, the validation will not strip away properties that are not specified explicitly in the schema.
   */

  allowAdditionalProperties(): this {
    return this.cloneAndUpdateSchema({ additionalProperties: true })
  }

  extend<NEW_PROPS extends Record<string, JSchema<any, any>>>(
    props: NEW_PROPS,
  ): JObjectInfer<
    {
      [K in keyof PROPS | keyof NEW_PROPS]: K extends keyof NEW_PROPS
        ? NEW_PROPS[K]
        : K extends keyof PROPS
          ? PROPS[K]
          : never
    },
    Opt
  > {
    const newBuilder = new JObjectInfer<PROPS, Opt>()
    _objectAssign(newBuilder.schema, deepCopyPreservingFunctions(this.schema))

    const incomingSchemaBuilder = new JObjectInfer<NEW_PROPS, false>(props)
    mergeJsonSchemaObjects(newBuilder.schema as any, incomingSchemaBuilder.schema as any)

    // This extend function is not type-safe as it is inferring,
    // so even if the base schema was already type-checked,
    // the new schema loses that quality.
    _objectAssign(newBuilder.schema, { hasIsOfTypeCheck: false })

    return newBuilder as unknown as JObjectInfer<
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

export class JArray<OUT, Opt> extends JBuilder<OUT[], Opt> {
  constructor(itemsSchema: JSchema<OUT, Opt>) {
    super({
      type: 'array',
      items: itemsSchema.build(),
    })
  }

  minLength(minItems: number): this {
    return this.cloneAndUpdateSchema({ minItems })
  }

  maxLength(maxItems: number): this {
    return this.cloneAndUpdateSchema({ maxItems })
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
    return this.cloneAndUpdateSchema({ uniqueItems: true })
  }
}

class JSet2Builder<OUT, Opt> extends JBuilder<Set2<OUT>, Opt> {
  constructor(itemsSchema: JSchema<OUT, Opt>) {
    super({
      type: ['array', 'object'],
      Set2: itemsSchema.build(),
    })
  }

  min(minItems: number): this {
    return this.cloneAndUpdateSchema({ minItems })
  }

  max(maxItems: number): this {
    return this.cloneAndUpdateSchema({ maxItems })
  }
}

export class JEnum<
  OUT extends string | number | boolean | null,
  Opt extends boolean = false,
> extends JBuilder<OUT, Opt> {
  constructor(enumValues: readonly OUT[], baseType: EnumBaseType, opt?: JsonBuilderRuleOpt) {
    const jsonSchema: JsonSchema = { enum: enumValues }
    // Specifying the base type helps in cases when we ask Ajv to coerce the types.
    // Having only the `enum` in the schema does not trigger a coercion in Ajv.
    if (baseType === 'string') jsonSchema.type = 'string'
    if (baseType === 'number') jsonSchema.type = 'number'

    super(jsonSchema)

    if (opt?.name) this.setErrorMessage('pattern', `is not a valid ${opt.name}`)
    if (opt?.msg) this.setErrorMessage('enum', opt.msg)
  }

  branded<B extends OUT>(): JEnum<B, Opt> {
    return this as unknown as JEnum<B, Opt>
  }
}

export class JTuple<ITEMS extends JSchema<any, any>[]> extends JBuilder<TupleOut<ITEMS>, false> {
  constructor(items: ITEMS) {
    super({
      type: 'array',
      prefixItems: items.map(i => i.build()),
      minItems: items.length,
      maxItems: items.length,
    })
  }
}

// ==== Standalone functions for j.object ====

function object(props: AnyObject): never
function object<OUT extends AnyObject>(props: {
  [K in keyof Required<OUT>]-?: JSchema<OUT[K], any>
}): JObject<OUT, false>

function object<OUT extends AnyObject>(props: {
  [key in keyof OUT]: JSchema<OUT[key], any>
}): JObject<OUT, false> {
  return new JObject<OUT, false>(props)
}

function objectInfer<P extends Record<string, JSchema<any, any>>>(
  props: P,
): JObjectInfer<P, false> {
  return new JObjectInfer<P, false>(props)
}

function objectDbEntity(props: AnyObject): never
function objectDbEntity<
  OUT extends BaseDBEntity,
  EXTRA_KEYS extends Exclude<keyof OUT, keyof BaseDBEntity> = Exclude<
    keyof OUT,
    keyof BaseDBEntity
  >,
>(
  props: {
    // ✅ all non-system fields must be explicitly provided
    [K in EXTRA_KEYS]-?: BuilderFor<OUT[K]>
  } &
    // ✅ if `id` differs, it's required
    (ExactMatch<OUT['id'], BaseDBEntity['id']> extends true
      ? { id?: BuilderFor<BaseDBEntity['id']> }
      : { id: BuilderFor<OUT['id']> }) &
    (ExactMatch<OUT['created'], BaseDBEntity['created']> extends true
      ? { created?: BuilderFor<BaseDBEntity['created']> }
      : { created: BuilderFor<OUT['created']> }) &
    (ExactMatch<OUT['updated'], BaseDBEntity['updated']> extends true
      ? { updated?: BuilderFor<BaseDBEntity['updated']> }
      : { updated: BuilderFor<OUT['updated']> }),
): JObject<OUT, false>

function objectDbEntity(props: AnyObject): any {
  return j.object({
    id: j.string(),
    created: j.number().unixTimestamp2000(),
    updated: j.number().unixTimestamp2000(),
    ...props,
  })
}

function record<
  KS extends JSchema<any, any>,
  VS extends JSchema<any, any>,
  Opt extends boolean = SchemaOpt<VS>,
>(
  keySchema: KS,
  valueSchema: VS,
): JObject<
  Opt extends true
    ? Partial<Record<SchemaOut<KS>, SchemaOut<VS>>>
    : Record<SchemaOut<KS>, SchemaOut<VS>>,
  false
> {
  const keyJsonSchema = keySchema.build()
  // Check if value schema is optional before build() strips the optionalField flag
  const isValueOptional = (valueSchema as JSchema<any, any>).getSchema().optionalField
  const valueJsonSchema = valueSchema.build()

  // When value schema is optional, wrap in anyOf to allow undefined values
  const finalValueSchema: JsonSchema = isValueOptional
    ? { anyOf: [{ isUndefined: true }, valueJsonSchema] }
    : valueJsonSchema

  return new JObject<
    Opt extends true
      ? Partial<Record<SchemaOut<KS>, SchemaOut<VS>>>
      : Record<SchemaOut<KS>, SchemaOut<VS>>,
    false
  >([], {
    hasIsOfTypeCheck: false,
    keySchema: keyJsonSchema,
    patternProperties: {
      ['^.*$']: finalValueSchema,
    },
  })
}

function withRegexKeys<S extends JSchema<any, any>>(
  keyRegex: RegExp | string,
  schema: S,
): JObject<StringMap<SchemaOut<S>>, false> {
  if (keyRegex instanceof RegExp) {
    _assert(
      !keyRegex.flags,
      `Regex flags are not supported by JSON Schema. Received: /${keyRegex.source}/${keyRegex.flags}`,
    )
  }
  const pattern = keyRegex instanceof RegExp ? keyRegex.source : keyRegex
  const jsonSchema = schema.build()

  return new JObject<StringMap<SchemaOut<S>>, false>([], {
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
  S extends JSchema<any, any>,
  K extends string | number = EnumKeyUnion<T>,
  Opt extends boolean = SchemaOpt<S>,
>(
  keys: T,
  schema: S,
): JObject<Opt extends true ? { [P in K]?: SchemaOut<S> } : { [P in K]: SchemaOut<S> }, false> {
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

  return new JObject<
    Opt extends true ? { [P in K]?: SchemaOut<S> } : { [P in K]: SchemaOut<S> },
    false
  >(props, { hasIsOfTypeCheck: false })
}

// ==== AjvSchema compat wrapper ====

/**
 * On creation - compiles ajv validation function.
 * Provides convenient methods, error reporting, etc.
 */
export class AjvSchema<OUT> {
  private constructor(
    public schema: JsonSchema<OUT>,
    cfg: Partial<AjvSchemaCfg> = {},
    preCompiledFn?: any,
  ) {
    this.cfg = {
      lazy: false,
      ...cfg,
      ajv: cfg.ajv || getAjv(),
      // Auto-detecting "InputName" from $id of the schema (e.g "Address.schema.json")
      inputName: cfg.inputName || (schema.$id ? _substringBefore(schema.$id, '.') : undefined),
    }

    if (preCompiledFn) {
      this._compiledFn = preCompiledFn
    } else if (!cfg.lazy) {
      this._getValidateFn() // compile eagerly
    }
  }

  /**
   * Shortcut for AjvSchema.create(schema, { lazy: true })
   */
  static createLazy<OUT>(
    schema: SchemaHandledByAjv<OUT>,
    cfg?: Partial<AjvSchemaCfg>,
  ): AjvSchema<OUT> {
    return AjvSchema.create(schema, {
      lazy: true,
      ...cfg,
    })
  }

  /**
   * Conveniently allows to pass either JsonSchema or JSchema builder, or existing AjvSchema.
   * If it's already an AjvSchema - it'll just return it without any processing.
   * If it's a Builder - will call `build` before proceeding.
   * Otherwise - will construct AjvSchema instance ready to be used.
   */
  static create<OUT>(schema: SchemaHandledByAjv<OUT>, cfg?: Partial<AjvSchemaCfg>): AjvSchema<OUT> {
    if (schema instanceof AjvSchema) return schema

    if (AjvSchema.isSchemaWithCachedAjvSchema<typeof schema, OUT>(schema)) {
      return AjvSchema.requireCachedAjvSchema<typeof schema, OUT>(schema)
    }

    let jsonSchema: JsonSchema<OUT>

    if (schema instanceof JSchema) {
      // oxlint-disable typescript-eslint(no-unnecessary-type-assertion)
      jsonSchema = (schema as JSchema<OUT, any>).build()
      AjvSchema.requireValidJsonSchema(jsonSchema)
    } else {
      jsonSchema = schema
    }

    // This is our own helper which marks a schema as optional
    // in case it is going to be used in an object schema,
    // where we need to mark the given property as not-required.
    // But once all compilation is done, the presence of this field
    // really upsets Ajv.
    delete jsonSchema.optionalField

    const ajvSchema = new AjvSchema<OUT>(jsonSchema, cfg)
    AjvSchema.cacheAjvSchema(schema, ajvSchema)

    return ajvSchema
  }

  /**
   * Creates a minimal AjvSchema wrapper from a pre-compiled validate function.
   * Used internally by JSchema to cache a compatible AjvSchema instance.
   */
  static _wrap<OUT>(schema: JsonSchema<OUT>, compiledFn: any): AjvSchema<OUT> {
    return new AjvSchema<OUT>(schema, {}, compiledFn)
  }

  static isSchemaWithCachedAjvSchema<Base, OUT>(
    schema: Base,
  ): schema is WithCachedAjvSchema<Base, OUT> {
    return !!(schema as any)?.[HIDDEN_AJV_SCHEMA]
  }

  static cacheAjvSchema<Base extends AnyObject, OUT>(
    schema: Base,
    ajvSchema: AjvSchema<OUT>,
  ): WithCachedAjvSchema<Base, OUT> {
    return Object.assign(schema, { [HIDDEN_AJV_SCHEMA]: ajvSchema })
  }

  static requireCachedAjvSchema<Base, OUT>(schema: WithCachedAjvSchema<Base, OUT>): AjvSchema<OUT> {
    return schema[HIDDEN_AJV_SCHEMA]
  }

  readonly cfg: AjvSchemaCfg

  private _compiledFn: any

  private _getValidateFn(): any {
    if (!this._compiledFn) {
      this._compiledFn = this.cfg.ajv.compile(this.schema as any)
    }
    return this._compiledFn
  }

  /**
   * It returns the original object just for convenience.
   */
  validate(input: unknown, opt: AjvValidationOptions = {}): OUT {
    const [err, output] = this.getValidationResult(input, opt)
    if (err) throw err
    return output
  }

  isValid(input: unknown, opt?: AjvValidationOptions): boolean {
    const [err] = this.getValidationResult(input, opt)
    return !err
  }

  getValidationResult(
    input: unknown,
    opt: AjvValidationOptions = {},
  ): ValidationFunctionResult<OUT, AjvValidationError> {
    const fn = this._getValidateFn()
    return executeValidation<OUT>(fn, this.schema, input, opt, this.cfg.inputName)
  }

  getValidationFunction(): ValidationFunction<OUT, AjvValidationError> {
    return (input, opt) => {
      return this.getValidationResult(input, {
        mutateInput: opt?.mutateInput,
        inputName: opt?.inputName,
        inputId: opt?.inputId,
      })
    }
  }

  private static requireValidJsonSchema(schema: JsonSchema): void {
    // For object schemas we require that it is type checked against an external type, e.g.:
    // interface Foo { name: string }
    // const schema = j.object({ name: j.string() }).ofType<Foo>()
    _assert(
      schema.type !== 'object' || schema.hasIsOfTypeCheck,
      'The schema must be type checked against a type or interface, using the `.isOfType()` helper in `j`.',
    )
  }
}

// ==== Shared validation logic ====

const separator = '\n'

function executeValidation<OUT>(
  fn: any,
  builtSchema: JsonSchema,
  input: unknown,
  opt: AjvValidationOptions = {},
  defaultInputName?: string,
): ValidationFunctionResult<OUT, AjvValidationError> {
  const item =
    opt.mutateInput !== false || typeof input !== 'object'
      ? input // mutate
      : _deepCopy(input) // not mutate

  let valid = fn(item) // mutates item, but not input
  _typeCast<OUT>(item)

  let output: OUT = item
  if (valid && builtSchema.postValidation) {
    const [err, result] = _try(() => builtSchema.postValidation!(output))
    if (err) {
      valid = false
      ;(fn as any).errors = [
        {
          instancePath: '',
          message: err.message,
        },
      ]
    } else {
      output = result as OUT
    }
  }

  if (valid) return [null, output]

  const errors = fn.errors!

  const {
    inputId = _isObject(input) ? (input as any)['id'] : undefined,
    inputName = defaultInputName || 'Object',
  } = opt
  const dataVar = [inputName, inputId].filter(Boolean).join('.')

  applyImprovementsOnErrorMessages(errors, builtSchema)

  let message = getAjv().errorsText(errors, {
    dataVar,
    separator,
  })

  // Note: if we mutated the input already, e.g stripped unknown properties,
  // the error message Input would contain already mutated object print, such as Input: {}
  // Unless `getOriginalInput` function is provided - then it will be used to preserve the Input pureness.
  const inputStringified = _inspect(opt.getOriginalInput?.() || input, { maxLen: 4000 })
  message = [message, 'Input: ' + inputStringified].join(separator)

  const err = new AjvValidationError(
    message,
    _filterNullishValues({
      errors,
      inputName,
      inputId,
    }),
  )
  return [err, output]
}

// ==== Error formatting helpers ====

function applyImprovementsOnErrorMessages(
  errors: ErrorObject<string, Record<string, any>, unknown>[] | null | undefined,
  schema: JsonSchema,
): void {
  if (!errors) return

  filterNullableAnyOfErrors(errors, schema)

  const { errorMessages } = schema

  for (const error of errors) {
    const errorMessage = getErrorMessageForInstancePath(schema, error.instancePath, error.keyword)

    if (errorMessage) {
      error.message = errorMessage
    } else if (errorMessages?.[error.keyword]) {
      error.message = errorMessages[error.keyword]
    } else {
      const unwrapped = unwrapNullableAnyOf(schema)
      if (unwrapped?.errorMessages?.[error.keyword]) {
        error.message = unwrapped.errorMessages[error.keyword]
      }
    }

    error.instancePath = error.instancePath.replaceAll(/\/(\d+)/g, `[$1]`).replaceAll('/', '.')
  }
}

/**
 * Filters out noisy errors produced by nullable anyOf patterns.
 * When `nullable()` wraps a schema in `anyOf: [realSchema, { type: 'null' }]`,
 * AJV produces "must be null" and "must match a schema in anyOf" errors
 * that are confusing. This method splices them out, keeping only the real errors.
 */
function filterNullableAnyOfErrors(
  errors: ErrorObject<string, Record<string, any>, unknown>[],
  schema: JsonSchema,
): void {
  // Collect exact schemaPaths to remove (anyOf aggregates) and prefixes (null branches)
  const exactPaths: string[] = []
  const nullBranchPrefixes: string[] = []

  for (const error of errors) {
    if (error.keyword !== 'anyOf') continue

    const parentSchema = resolveSchemaPath(schema, error.schemaPath)
    if (!parentSchema) continue

    const nullIndex = unwrapNullableAnyOfIndex(parentSchema)
    if (nullIndex === -1) continue

    exactPaths.push(error.schemaPath) // e.g. "#/anyOf"
    const anyOfBase = error.schemaPath.slice(0, -'anyOf'.length)
    nullBranchPrefixes.push(`${anyOfBase}anyOf/${nullIndex}/`) // e.g. "#/anyOf/1/"
  }

  if (!exactPaths.length) return

  for (let i = errors.length - 1; i >= 0; i--) {
    const sp = errors[i]!.schemaPath
    if (exactPaths.includes(sp) || nullBranchPrefixes.some(p => sp.startsWith(p))) {
      errors.splice(i, 1)
    }
  }
}

/**
 * Navigates the schema tree using an AJV schemaPath (e.g. "#/properties/foo/anyOf")
 * and returns the parent schema containing the last keyword.
 */
function resolveSchemaPath(schema: JsonSchema, schemaPath: string): JsonSchema | undefined {
  // schemaPath looks like "#/properties/foo/anyOf" or "#/anyOf"
  // We want the schema that contains the final keyword (e.g. "anyOf")
  const segments = schemaPath.replace(/^#\//, '').split('/')
  // Remove the last segment (the keyword itself, e.g. "anyOf")
  segments.pop()

  let current: any = schema
  for (const segment of segments) {
    if (!current || typeof current !== 'object') return undefined
    current = current[segment]
  }
  return current as JsonSchema | undefined
}

function getErrorMessageForInstancePath(
  schema: JsonSchema | undefined,
  instancePath: string,
  keyword: string,
): string | undefined {
  if (!schema || !instancePath) return undefined

  const segments = instancePath.split('/').filter(Boolean)
  return traverseSchemaPath(schema, segments, keyword)
}

function traverseSchemaPath(
  schema: JsonSchema,
  segments: string[],
  keyword: string,
): string | undefined {
  if (!segments.length) return undefined

  const [currentSegment, ...remainingSegments] = segments

  const nextSchema = getChildSchema(schema, currentSegment)
  if (!nextSchema) return undefined

  if (nextSchema.errorMessages?.[keyword]) {
    return nextSchema.errorMessages[keyword]
  }

  // Check through nullable wrapper
  const unwrapped = unwrapNullableAnyOf(nextSchema)
  if (unwrapped?.errorMessages?.[keyword]) {
    return unwrapped.errorMessages[keyword]
  }

  if (remainingSegments.length) {
    return traverseSchemaPath(nextSchema, remainingSegments, keyword)
  }

  return undefined
}

function getChildSchema(schema: JsonSchema, segment: string | undefined): JsonSchema | undefined {
  if (!segment) return undefined

  // Unwrap nullable anyOf to find properties/items through nullable wrappers
  const effectiveSchema = unwrapNullableAnyOf(schema) ?? schema

  if (/^\d+$/.test(segment) && effectiveSchema.items) {
    return getArrayItemSchema(effectiveSchema, segment)
  }

  return getObjectPropertySchema(effectiveSchema, segment)
}

function getArrayItemSchema(schema: JsonSchema, indexSegment: string): JsonSchema | undefined {
  if (!schema.items) return undefined

  if (Array.isArray(schema.items)) {
    return schema.items[Number(indexSegment)]
  }

  return schema.items
}

function getObjectPropertySchema(schema: JsonSchema, segment: string): JsonSchema | undefined {
  return schema.properties?.[segment as keyof typeof schema.properties]
}

function unwrapNullableAnyOf(schema: JsonSchema): JsonSchema | undefined {
  const nullIndex = unwrapNullableAnyOfIndex(schema)
  if (nullIndex === -1) return undefined
  return schema.anyOf![1 - nullIndex]!
}

function unwrapNullableAnyOfIndex(schema: JsonSchema): number {
  if (schema.anyOf?.length !== 2) return -1
  const nullIndex = schema.anyOf.findIndex(s => s.type === 'null')
  return nullIndex
}

// ==== Utility helpers ====

function addPropertiesToSchema(schema: JsonSchema, props: AnyObject): void {
  const properties: Record<string, JsonSchema> = {}
  const required: string[] = []

  for (const [key, builder] of Object.entries(props)) {
    const isOptional = (builder as JSchema<any, any>).getSchema().optionalField
    if (!isOptional) {
      required.push(key)
    }

    const builtSchema = builder.build()
    properties[key] = builtSchema
  }

  schema.properties = properties
  schema.required = _uniq(required).sort()
}

function hasNoObjectSchemas(schema: JsonSchema): boolean {
  if (Array.isArray(schema.type)) {
    return schema.type.every(type =>
      ['string', 'number', 'integer', 'boolean', 'null'].includes(type),
    )
  } else if (schema.anyOf) {
    return schema.anyOf.every(hasNoObjectSchemas)
  } else if (schema.oneOf) {
    return schema.oneOf.every(hasNoObjectSchemas)
  } else if (schema.enum) {
    return true
  } else if (schema.type === 'array') {
    return !schema.items || hasNoObjectSchemas(schema.items)
  } else {
    return !!schema.type && ['string', 'number', 'integer', 'boolean', 'null'].includes(schema.type)
  }

  return false
}

type EnumBaseType = 'string' | 'number' | 'other'

/**
 * Deep copy that preserves functions in customValidations/customConversions.
 * Unlike structuredClone, this handles function references (which only exist in those two properties).
 */
function deepCopyPreservingFunctions<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(deepCopyPreservingFunctions) as T
  const copy = {} as T
  for (const key of Object.keys(obj)) {
    const value = (obj as any)[key]
    // customValidations/customConversions are arrays of functions - shallow copy the array
    ;(copy as any)[key] =
      (key === 'customValidations' || key === 'customConversions') && Array.isArray(value)
        ? [...value]
        : deepCopyPreservingFunctions(value)
  }
  return copy
}

// ==== Types & Interfaces ====

export interface AjvValidationOptions {
  /**
   * Custom Ajv instance to use for this validation.
   * Overrides the default Ajv or any Ajv set at construction time.
   * Compiled functions are cached per Ajv instance.
   */
  ajv?: Ajv

  /**
   * Defaults to true,
   * because that's how AJV works by default,
   * and what gives it performance advantage.
   * (Because we have found that deep-clone is surprisingly slow,
   * nearly as slow as Joi validation).
   *
   * If set to true - AJV will mutate the input in case it needs to apply transformations
   * (strip unknown properties, convert types, etc).
   *
   * If false - it will deep-clone (using JSON.stringify+parse) the input to prevent its mutation.
   * Will return the cloned/mutated object.
   * Please note that JSON.stringify+parse has side-effects,
   * e.g it will transform Buffer into a weird object.
   */
  mutateInput?: boolean
  inputName?: string
  inputId?: string
  /**
   * Function that returns "original input".
   * What is original input?
   * It's an input in its original non-mutated form.
   * Why is it needed?
   * Because we mutates the Input here. And after its been mutated - we no longer
   * can include it "how it was" in an error message. So, for that reason we'll use
   * `getOriginalInput()`, if it's provided.
   */
  getOriginalInput?: () => unknown
}

export interface AjvSchemaCfg {
  /**
   * Pass Ajv instance, otherwise Ajv will be created with
   * AjvSchema default (not the same as Ajv defaults) parameters
   */
  ajv: Ajv

  inputName?: string

  /**
   * If true - schema will be compiled on-demand (lazily).
   * Default: false.
   */
  lazy?: boolean
}

export type SchemaHandledByAjv<OUT> = JSchema<OUT, any> | JsonSchema<OUT> | AjvSchema<OUT>

export interface JsonSchema<OUT = unknown> {
  readonly out?: OUT

  $schema?: string
  $id?: string
  title?: string
  description?: string
  deprecated?: boolean
  readOnly?: boolean
  writeOnly?: boolean

  type?: string | string[]
  items?: JsonSchema
  prefixItems?: JsonSchema[]
  properties?: {
    [K in keyof OUT]: JsonSchema<OUT[K]>
  }
  patternProperties?: StringMap<JsonSchema<any>>
  required?: string[]
  additionalProperties?: boolean
  minProperties?: number
  maxProperties?: number

  default?: OUT

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
  IsoMonth?: JsonSchemaIsoMonthOptions
  instanceof?: string | string[]
  transform?: { trim?: true; toLowerCase?: true; toUpperCase?: true; truncate?: number }
  errorMessages?: StringMap<string>
  optionalValues?: (string | number | boolean | null)[]
  keySchema?: JsonSchema
  isUndefined?: true
  minProperties2?: number
  exclusiveProperties?: (readonly string[])[]
  anyOfBy?: {
    propertyName: string
    schemaDictionary: Record<string, JsonSchema>
  }
  anyOfThese?: JsonSchema[]
  precision?: number
  customValidations?: CustomValidatorFn[]
  customConversions?: CustomConverterFn<any>[]
  postValidation?: PostValidatonFn<any, OUT>
}

export type PostValidatonFn<OUT, OUT2> = (v: OUT) => OUT2
export type CustomValidatorFn = (v: any) => string | undefined
export type CustomConverterFn<OUT> = (v: any) => OUT

type Expand<T> = { [K in keyof T]: T[K] }

type StripIndexSignatureDeep<T> = T extends readonly unknown[]
  ? T
  : T extends Record<string, any>
    ? {
        [K in keyof T as string extends K
          ? never
          : number extends K
            ? never
            : symbol extends K
              ? never
              : K]: StripIndexSignatureDeep<T[K]>
      }
    : T

type RelaxIndexSignature<T> = T extends readonly unknown[]
  ? T
  : T extends AnyObject
    ? { [K in keyof T]: RelaxIndexSignature<T[K]> }
    : T

type Override<T, U> = Omit<T, keyof U> & U

declare const allowExtraKeysSymbol: unique symbol

type HasAllowExtraKeys<T> = T extends { readonly [allowExtraKeysSymbol]?: true } ? true : false

type IsAny<T> = 0 extends 1 & T ? true : false

type IsAssignableRelaxed<A, B> =
  IsAny<RelaxIndexSignature<A>> extends true
    ? true
    : [RelaxIndexSignature<A>] extends [B]
      ? true
      : false

type ExactMatchBase<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false

type ExactMatch<A, B> =
  HasAllowExtraKeys<B> extends true
    ? IsAssignableRelaxed<B, A>
    : ExactMatchBase<Expand<A>, Expand<B>> extends true
      ? true
      : ExactMatchBase<Expand<StripIndexSignatureDeep<A>>, Expand<StripIndexSignatureDeep<B>>>

type BuilderOutUnion<B extends readonly JSchema<any, any>[]> = {
  [K in keyof B]: B[K] extends JSchema<infer O, any> ? O : never
}[number]

type AnyOfByOut<D extends Record<PropertyKey, JSchema<any, any>>> = {
  [K in keyof D]: D[K] extends JSchema<infer O, any> ? O : never
}[keyof D]

type BuilderFor<T> = JSchema<T, any>

export interface JsonBuilderRuleOpt {
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

type SchemaOut<S> = S extends JSchema<infer OUT, any> ? OUT : never
type SchemaOpt<S> = S extends JSchema<any, infer Opt> ? (Opt extends true ? true : false) : false

type TupleOut<T extends readonly JSchema<any, any>[]> = {
  [K in keyof T]: T[K] extends JSchema<infer O, any> ? O : never
}
