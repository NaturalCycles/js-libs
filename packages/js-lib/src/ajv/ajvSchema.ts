import type { Ajv, ErrorObject } from 'ajv'
import type { ErrorData } from 'error/error.model.js'
import { _lazyValue } from '../define.js'
import { AppError } from '../error/error.util.js'
import { _isObject } from '../is.util.js'
import { type JsonSchema2, JsonSchemaAnyBuilder2 } from '../json-schema/jsonSchemaBuilder2.js'
import { _deepCopy, _filterNullishValues } from '../object/object.util.js'
import { _inspect } from '../string/inspect.js'
import { _substringBefore } from '../string/string.util.js'
import { _typeCast, type AnyObject } from '../types.js'
import type { ValidationFunction, ValidationFunctionResult } from '../validation/validation.js'
import { getAjv } from './getAjv.js'

/**
 * On creation - compiles ajv validation function.
 * Provides convenient methods, error reporting, etc.
 */
export class AjvSchema<IN, OUT> {
  private constructor(
    public schema: JsonSchema2<IN, OUT>,
    cfg: Partial<AjvSchemaCfg> = {},
  ) {
    this.cfg = {
      lazy: false,
      ...cfg,
      ajv: cfg.ajv || getAjv(),
      // Auto-detecting "InputName" from $id of the schema (e.g "Address.schema.json")
      inputName: cfg.inputName || (schema.$id ? _substringBefore(schema.$id, '.') : undefined),
    }

    if (!cfg.lazy) {
      this.getAJVValidateFunction() // compile eagerly
    }
  }

  /**
   * Shortcut for AjvSchema.create(schema, { lazy: true })
   */
  static createLazy<IN, OUT>(
    schema: JsonSchema2<IN, OUT>,
    cfg?: Partial<AjvSchemaCfg>,
  ): AjvSchema<IN, OUT> {
    return AjvSchema.create(schema, {
      lazy: true,
      ...cfg,
    })
  }

  /**
   * Conveniently allows to pass either JsonSchema or JsonSchemaBuilder, or existing AjvSchema.
   * If it's already an AjvSchema - it'll just return it without any processing.
   * If it's a Builder - will call `build` before proceeding.
   * Otherwise - will construct AjvSchema instance ready to be used.
   *
   * Implementation note: JsonSchemaBuilder goes first in the union type, otherwise TypeScript fails to infer <T> type
   * correctly for some reason.
   */
  static create<IN, OUT>(
    schema: SchemaHandledByAjv<IN, OUT>,
    cfg?: Partial<AjvSchemaCfg>,
  ): AjvSchema<IN, OUT> {
    if (schema instanceof AjvSchema) return schema

    if (AjvSchema.isSchemaWithCachedAjvSchema<typeof schema, IN, OUT>(schema)) {
      return AjvSchema.requireCachedAjvSchema<typeof schema, IN, OUT>(schema)
    }

    let jsonSchema: JsonSchema2<IN, OUT>

    if (AjvSchema.isJsonSchemaBuilder(schema)) {
      jsonSchema = (schema as JsonSchemaAnyBuilder2<IN, OUT, any>).build()
    } else {
      jsonSchema = schema as JsonSchema2<IN, OUT>
    }

    const ajvSchema = new AjvSchema<IN, OUT>(jsonSchema, cfg)
    AjvSchema.cacheAjvSchema(schema, ajvSchema)

    return ajvSchema
  }

  static isJsonSchemaBuilder<IN, OUT>(
    schema: unknown,
  ): schema is JsonSchemaAnyBuilder2<IN, OUT, any> {
    return schema instanceof JsonSchemaAnyBuilder2
  }

  readonly cfg: AjvSchemaCfg

  /**
   * It returns the original object just for convenience.
   * Reminder: Ajv will MUTATE your object under 2 circumstances:
   * 1. `useDefaults` option (enabled by default!), which will set missing/empty values that have `default` set in the schema.
   * 2. `coerceTypes` (false by default).
   *
   * Returned object is always the same object (`===`) that was passed, so it is returned just for convenience.
   */
  validate(input: IN, opt: AjvValidationOptions = {}): OUT {
    const [err, output] = this.getValidationResult(input, opt)
    if (err) throw err
    return output
  }

  isValid(input: IN, opt?: AjvValidationOptions): boolean {
    // todo: we can make it both fast and non-mutating by using Ajv
    // with "removeAdditional" and "useDefaults" disabled.
    const [err] = this.getValidationResult(input, opt)
    return !err
  }

  getValidationResult(
    input: IN,
    opt: AjvValidationOptions = {},
  ): ValidationFunctionResult<OUT, AjvValidationError> {
    const fn = this.getAJVValidateFunction()

    const item =
      opt.mutateInput !== false || typeof input !== 'object'
        ? input // mutate
        : _deepCopy(input) // not mutate

    const valid = fn(item) // mutates item
    _typeCast<OUT>(item)
    if (valid) return [null, item]

    const errors = fn.errors!

    const {
      inputId = _isObject(input) ? input['id' as keyof IN] : undefined,
      inputName = this.cfg.inputName || 'Object',
    } = opt
    const dataVar = [inputName, inputId].filter(Boolean).join('.')

    let message = this.cfg.ajv.errorsText(errors, {
      dataVar,
      separator,
    })

    // Note: if we mutated the input already, e.g stripped unknown properties,
    // the error message Input would contain already mutated object print, such as Input: {}
    const inputStringified = _inspect(input, { maxLen: 4000 })
    message = [message, 'Input: ' + inputStringified].join(separator)

    const err = new AjvValidationError(
      message,
      _filterNullishValues({
        errors,
        inputName,
        inputId,
      }),
    )
    return [err, item]
  }

  getValidationFunction(): ValidationFunction<IN, OUT, AjvValidationError> {
    return (input, opt) => {
      return this.getValidationResult(input, {
        mutateInput: opt?.mutateInput,
        inputName: opt?.inputName,
        inputId: opt?.inputId,
      })
    }
  }

  static isSchemaWithCachedAjvSchema<Base, IN, OUT>(
    schema: Base,
  ): schema is WithCachedAjvSchema<Base, IN, OUT> {
    return !!(schema as any)?.[HIDDEN_AJV_SCHEMA]
  }

  static cacheAjvSchema<Base extends AnyObject, IN, OUT>(
    schema: Base,
    ajvSchema: AjvSchema<IN, OUT>,
  ): WithCachedAjvSchema<Base, IN, OUT> {
    return Object.assign(schema, { [HIDDEN_AJV_SCHEMA]: ajvSchema })
  }

  static requireCachedAjvSchema<Base, IN, OUT>(
    schema: WithCachedAjvSchema<Base, IN, OUT>,
  ): AjvSchema<IN, OUT> {
    return schema[HIDDEN_AJV_SCHEMA]
  }

  private getAJVValidateFunction = _lazyValue(() => this.cfg.ajv.compile(this.schema as any))
}

const separator = '\n'

export const HIDDEN_AJV_SCHEMA = Symbol('HIDDEN_AJV_SCHEMA')

export type WithCachedAjvSchema<Base, IN, OUT> = Base & {
  [HIDDEN_AJV_SCHEMA]: AjvSchema<IN, OUT>
}

export interface AjvValidationOptions {
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
}

export interface AjvSchemaCfg {
  /**
   * Pass Ajv instance, otherwise Ajv will be created with
   * AjvSchema default (not the same as Ajv defaults) parameters
   */
  ajv: Ajv

  inputName?: string

  /**
   * Option of Ajv.
   * If set to true - will mutate your input objects!
   * Defaults to false.
   *
   * This option is a "shortcut" to skip creating and passing Ajv instance.
   */
  // coerceTypes?: boolean

  /**
   * If true - schema will be compiled on-demand (lazily).
   * Default: false.
   */
  lazy?: boolean
}

export type SchemaHandledByAjv<IN, OUT> = JsonSchemaAnyBuilder2<IN, OUT, any> | JsonSchema2<IN, OUT>

export interface AjvValidationErrorData extends ErrorData {
  errors: ErrorObject[]
  inputName?: string
  inputId?: string
}

export class AjvValidationError extends AppError<AjvValidationErrorData> {
  constructor(message: string, data: AjvValidationErrorData) {
    super(message, data, {
      name: 'AjvValidationError',
    })
  }
}
