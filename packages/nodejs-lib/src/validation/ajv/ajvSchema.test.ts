import { j, type JsonSchema, type JsonSchemaObjectBuilder } from '@naturalcycles/js-lib/json-schema'
import { _typeCast } from '@naturalcycles/js-lib/types'
import { z, type ZodType } from '@naturalcycles/js-lib/zod'
import { describe, expect, test } from 'vitest'
import { AjvSchema, HIDDEN_AJV_SCHEMA, type WithCachedAjvSchema } from './ajvSchema.js'

describe('create', () => {
  test('should cache the compiled AjvSchema in the ZodSchema', () => {
    const zodSchema = z.object({ foo: z.string() })

    const ajvSchema = AjvSchema.create(zodSchema)

    _typeCast<WithCachedAjvSchema<ZodType<any>, any>>(zodSchema)
    expect(zodSchema[HIDDEN_AJV_SCHEMA]).toBe(ajvSchema)
  })

  test('should cache the compiled AjvSchema in the JsonSchemaBuilder', () => {
    const jsonSchemaBuilder = j.object({ foo: j.string() })

    const ajvSchema = AjvSchema.create(jsonSchemaBuilder)

    _typeCast<WithCachedAjvSchema<JsonSchemaObjectBuilder<any>, any>>(jsonSchemaBuilder)
    expect(jsonSchemaBuilder[HIDDEN_AJV_SCHEMA]).toBe(ajvSchema)
  })

  test('should cache the compiled AjvSchema in the JsonSchema', () => {
    const jsonSchemaBuilder = j.object({ foo: j.string() })
    const jsonSchema = jsonSchemaBuilder.build()

    const ajvSchema = AjvSchema.create(jsonSchema)

    _typeCast<WithCachedAjvSchema<JsonSchema<any>, any>>(jsonSchema)
    expect(jsonSchema[HIDDEN_AJV_SCHEMA]).toBe(ajvSchema)
  })
})

describe('createFromZod', () => {
  test('should cache the compiled AjvSchema inside the ZodSchema', () => {
    const zodSchema = z.object({ foo: z.string() })

    const ajvSchema = AjvSchema.createFromZod(zodSchema)

    _typeCast<WithCachedAjvSchema<ZodType<any>, any>>(zodSchema)
    expect(zodSchema[HIDDEN_AJV_SCHEMA]).toBe(ajvSchema)
  })

  test('should cache the re-compiled AjvSchema when ZodSchema is extended', () => {
    const zodSchema1 = z.object({ foo: z.string() })
    const ajvSchema1 = AjvSchema.createFromZod(zodSchema1)
    const zodSchema = zodSchema1.extend({ bar: z.string() })

    const ajvSchema = AjvSchema.createFromZod(zodSchema)

    _typeCast<WithCachedAjvSchema<ZodType<any>, any>>(zodSchema1)
    expect(zodSchema1[HIDDEN_AJV_SCHEMA]).toBe(ajvSchema1)
    _typeCast<WithCachedAjvSchema<ZodType<any>, any>>(zodSchema)
    expect(zodSchema[HIDDEN_AJV_SCHEMA]).toBe(ajvSchema)
  })

  test('should return the cached AjvSchema when it exists', () => {
    const zodSchema = z.object({ foo: z.string() })
    const ajvSchema = AjvSchema.createFromZod(zodSchema)

    const ajvSchemaAgain = AjvSchema.createFromZod(zodSchema)

    expect(ajvSchemaAgain).toBe(ajvSchema)
  })
})
