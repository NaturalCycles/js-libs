import { _typeCast } from '@naturalcycles/js-lib/types'
import { z } from '@naturalcycles/js-lib/zod'
import { describe, expect, test } from 'vitest'
import { AjvSchema, HIDDEN_AJV_SCHEMA, type ZodTypeWithAjvSchema } from './ajvSchema.js'

describe('createFromZod', () => {
  test('should cache the compiled AjvSchema inside the ZodSchema', () => {
    const zodSchema = z.object({ foo: z.string() })

    const ajvSchema = AjvSchema.createFromZod(zodSchema)

    _typeCast<ZodTypeWithAjvSchema<any>>(zodSchema)
    expect(zodSchema[HIDDEN_AJV_SCHEMA]).toBe(ajvSchema)
  })

  test('should cache the re-compiled AjvSchema when ZodSchema is extended', () => {
    const zodSchema1 = z.object({ foo: z.string() })
    const ajvSchema1 = AjvSchema.createFromZod(zodSchema1)
    const zodSchema = zodSchema1.extend({ bar: z.string() })

    const ajvSchema = AjvSchema.createFromZod(zodSchema)

    _typeCast<ZodTypeWithAjvSchema<any>>(zodSchema1)
    expect(zodSchema1[HIDDEN_AJV_SCHEMA]).toBe(ajvSchema1)
    _typeCast<ZodTypeWithAjvSchema<any>>(zodSchema)
    expect(zodSchema[HIDDEN_AJV_SCHEMA]).toBe(ajvSchema)
  })

  test('should return the cached AjvSchema when it exists', () => {
    const zodSchema = z.object({ foo: z.string() })
    const ajvSchema = AjvSchema.createFromZod(zodSchema)

    const ajvSchemaAgain = AjvSchema.createFromZod(zodSchema)

    expect(ajvSchemaAgain).toBe(ajvSchema)
  })
})
