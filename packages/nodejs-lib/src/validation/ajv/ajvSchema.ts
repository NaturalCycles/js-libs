import {
  _isObject,
  _lazyValue,
  type ValidationFunction,
  type ValidationFunctionResult,
} from '@naturalcycles/js-lib'
import type { JsonSchema, JsonSchemaBuilder } from '@naturalcycles/js-lib/json-schema'
import { JsonSchemaAnyBuilder } from '@naturalcycles/js-lib/json-schema'
import { _deepCopy, _filterNullishValues } from '@naturalcycles/js-lib/object'
import { _substringBefore } from '@naturalcycles/js-lib/string'
import type { AnyObject } from '@naturalcycles/js-lib/types'
import { z, ZodType } from '@naturalcycles/js-lib/zod'
import type { Ajv } from 'ajv'
import { _inspect } from '../../string/inspect.js'
import { AjvValidationError } from './ajvValidationError.js'
import { getAjv } from './getAjv.js'

export type SchemaHandledByAjv<T> = JsonSchemaBuilder<T> | JsonSchema<T> | AjvSchema<T> | ZodType<T>

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

/**
 * On creation - compiles ajv validation function.
 * Provides convenient methods, error reporting, etc.
 */
export class AjvSchema<T = unknown> {
  private constructor(
    public schema: JsonSchema<T>,
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
  static createLazy<T>(
    schema: JsonSchemaBuilder<T> | JsonSchema<T> | AjvSchema<T>,
    cfg?: Partial<AjvSchemaCfg>,
  ): AjvSchema<T> {
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
  static create<T>(schema: SchemaHandledByAjv<T>, cfg?: Partial<AjvSchemaCfg>): AjvSchema<T> {
    if (schema instanceof AjvSchema) return schema

    if (AjvSchema.isSchemaWithCachedAjvSchema<typeof schema, T>(schema)) {
      return AjvSchema.requireCachedAjvSchema<typeof schema, T>(schema)
    }

    let jsonSchema: JsonSchema<T>

    if (AjvSchema.isJsonSchemaBuilder(schema)) {
      jsonSchema = schema.build()
    } else if (AjvSchema.isZodSchema(schema)) {
      jsonSchema = z.toJSONSchema(schema, { target: 'draft-7' }) as JsonSchema<T>
    } else {
      jsonSchema = schema
    }

    const ajvSchema = new AjvSchema<T>(jsonSchema, cfg)
    AjvSchema.cacheAjvSchema(schema, ajvSchema)

    return ajvSchema
  }

  /**
   * @deprecated
   *
   * Use `AjvSchema.create`
   */
  static createFromZod<T>(zodSchema: ZodType<T>, cfg?: Partial<AjvSchemaCfg>): AjvSchema<T> {
    return AjvSchema.create(zodSchema, cfg)
  }

  static isJsonSchemaBuilder<T>(schema: unknown): schema is JsonSchemaBuilder<T> {
    return schema instanceof JsonSchemaAnyBuilder
  }

  static isZodSchema<T>(schema: unknown): schema is ZodType<T> {
    return schema instanceof ZodType
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
  validate(input: T, opt: AjvValidationOptions = {}): T {
    const [err, output] = this.getValidationResult(input, opt)
    if (err) throw err
    return output
  }

  isValid(input: T, opt?: AjvValidationOptions): boolean {
    // todo: we can make it both fast and non-mutating by using Ajv
    // with "removeAdditional" and "useDefaults" disabled.
    const [err] = this.getValidationResult(input, opt)
    return !err
  }

  getValidationResult(
    input: T,
    opt: AjvValidationOptions = {},
  ): ValidationFunctionResult<T, AjvValidationError> {
    const fn = this.getAJVValidateFunction()

    const item =
      opt.mutateInput !== false || typeof input !== 'object'
        ? input // mutate
        : _deepCopy(input) // not mutate

    const valid = fn(item) // mutates item
    if (valid) return [null, item]

    const errors = fn.errors!

    const {
      inputId = _isObject(input) ? (input['id' as keyof T] as any) : undefined,
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

  getValidationFunction(): ValidationFunction<T, AjvValidationError> {
    return (input, opt) => {
      return this.getValidationResult(input, {
        mutateInput: opt?.mutateInput,
        inputName: opt?.inputName,
        inputId: opt?.inputId,
      })
    }
  }

  static isSchemaWithCachedAjvSchema<Base, T>(
    schema: Base,
  ): schema is WithCachedAjvSchema<Base, T> {
    return !!(schema as any)?.[HIDDEN_AJV_SCHEMA]
  }

  static cacheAjvSchema<Base extends AnyObject, T>(
    schema: Base,
    ajvSchema: AjvSchema<T>,
  ): WithCachedAjvSchema<Base, T> {
    return Object.assign(schema, { [HIDDEN_AJV_SCHEMA]: ajvSchema })
  }

  static requireCachedAjvSchema<Base, T>(schema: WithCachedAjvSchema<Base, T>): AjvSchema<T> {
    return schema[HIDDEN_AJV_SCHEMA]
  }

  private getAJVValidateFunction = _lazyValue(() => this.cfg.ajv.compile<T>(this.schema))
}

const separator = '\n'

export const HIDDEN_AJV_SCHEMA = Symbol('HIDDEN_AJV_SCHEMA')

export type WithCachedAjvSchema<Base, T> = Base & {
  [HIDDEN_AJV_SCHEMA]: AjvSchema<T>
}
