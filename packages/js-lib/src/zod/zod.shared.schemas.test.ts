import { AjvSchema, getAjv } from '@naturalcycles/nodejs-lib/ajv'
import type { JsonSchema } from '@naturalcycles/nodejs-lib/ajv'
import { describe, expect, test } from 'vitest'
import type { IsoDate, UnixTimestamp } from '../types.js'
import { customZodSchemas, z } from './index.js'
import type { zInfer, ZodType } from './index.js'

test.each(Object.keys(customZodSchemas))(
  'custom zod schemas like "z.%s" should properly convert to JSON schema and AJV schema',
  key => {
    const validator = customZodSchemas[key as keyof typeof customZodSchemas]
    const zodSchema = z.object({ value: validator() })
    const jsonSchema = z.toJSONSchema(zodSchema, { target: 'draft-2020-12' })
    const ajvSchema = getAjv().compile(jsonSchema)

    expect(ajvSchema).toBeDefined()
  },
)

test('zod schemas with branded types should still be extensible', () => {
  const schema = z.object({
    created: z.unixTimestamp().min(0),
  })

  expect(schema).toBeDefined()
})

test('zod type inference should work correctly', () => {
  const schema = z.object({
    id: z.string(),
    count: z.int(),
    created: z.unixTimestamp(),
    date: z.isoDate(),
  })

  interface MyType extends zInfer<typeof schema> {}

  const data = {
    id: '123',
    count: 42,
    created: 1622547800 as UnixTimestamp,
    date: '2021-01-01' as IsoDate,
  } satisfies MyType

  expect(schema.parse(data)).toEqual(data)
})

describe('z.dbEntity', () => {
  test('should have id, created, updated fields', () => {
    const zodSchema = z.dbEntity()
    const data = {
      id: '123',
      created: 1622547800 as UnixTimestamp,
      updated: 1622547800 as UnixTimestamp,
    }
    const result = zodSchema.parse(data)
    expect(result).toEqual(data)
    expect(result.id).toBe('123')

    const ajvResult = createAjvSchemaFromZod(zodSchema).getValidationResult(data)
    expect(ajvResult[0]).toBeNull()
    expect(ajvResult[1]).toBe(data)
  })

  test('should be extensible with additional fields', () => {
    const zodSchema = z.dbEntity({
      name: z.string(),
    })
    const data = {
      id: '123',
      created: 1622547800 as UnixTimestamp,
      updated: 1622547800 as UnixTimestamp,
      name: 'Test Entity',
    }
    const result = zodSchema.parse(data)
    expect(result).toEqual(data)
    expect(result.id).toBe('123')
    expect(result.name).toBe('Test Entity')

    const ajvResult = createAjvSchemaFromZod(zodSchema).getValidationResult(data)
    expect(ajvResult[0]).toBeNull()
    expect(ajvResult[1]).toBe(data)
  })
})

describe('z.isoDate', () => {
  test('should accept 2001-01-01 ISO date format', () => {
    const date = '2001-01-01'
    const schema = z.isoDate()

    const result = schema.parse(date)
    expect(result).toBe(date)

    const ajvResult = createAjvSchemaFromZod(schema).getValidationResult(date)
    expect(ajvResult[0]).toBeNull()
    expect(ajvResult[1]).toBe(date)
  })

  const invalidCases = [
    '20010101', // valid ISO 8601 YYYYMMDD
    '2001-01', // valid ISO 8601 YYYY-MM
    '2001-W01-1', // valid ISO 8601 YYYY-Www-D
    '2001W011', // valid ISO 8601 YYYYWwwD
    '2001-W01', // valid ISO 8601 YYYY-Www
    '2001W01', // valid ISO 8601 YYYYWww
    '2001-01-1', // invalid
  ]
  test.each(invalidCases)('should not accept %s format', date => {
    const schema = z.isoDate()

    const result = schema.safeParse(date)
    expect(result.success).toBe(false)

    const ajvResult = createAjvSchemaFromZod(schema).getValidationResult(date)
    expect(ajvResult[0]).not.toBeNull()
    expect(ajvResult[1]).toBe(date)
  })
})

function createAjvSchemaFromZod<T extends ZodType<any, any, any>>(
  schema: T,
): AjvSchema<T['_output']> {
  const jsonSchema = z.toJSONSchema(schema, {
    target: 'draft-2020-12',
  }) as unknown as JsonSchema<T['_output']>

  return AjvSchema.create(jsonSchema)
}
