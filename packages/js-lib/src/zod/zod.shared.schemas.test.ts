import { getAjv } from '@naturalcycles/nodejs-lib'
import { describe, expect, test } from 'vitest'
import { customZodSchemas, z } from './index.js'

test.each(Object.keys(customZodSchemas))(
  'custom zod schemas like "z.%s" should properly convert to JSON schema and AJV schema',
  key => {
    const validator = customZodSchemas[key as keyof typeof customZodSchemas]
    const zodSchema = z.object({ value: validator() })
    const jsonSchema = z.toJSONSchema(zodSchema, { target: 'draft-7' })
    const ajvSchema = getAjv().compile(jsonSchema)

    expect(ajvSchema).toBeDefined()
  },
)

describe('z.email', () => {
  test('should accept a valid email address', () => {
    const email = 'test@example.com'
    const result = z.email().parse(email)
    expect(result).toBe(email)
  })

  test('should not reject an email with a capital letter', () => {
    const email = 'Test@example.com'
    const result = z.email().safeParse(email)
    expect(result.success).toBe(true)
  })

  test('should not trim before validation', () => {
    const email = ' test@example.com '
    const result = z.email().safeParse(email)
    expect(result.success).toBe(false)
  })
})

describe('z.isoDate', () => {
  test('should accept 2001-01-01 ISO date format', () => {
    const date = '2001-01-01'
    const result = z.isoDate().parse(date)
    expect(result).toBe(date)
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
    const result = z.isoDate().safeParse(date)
    expect(result.success).toBe(false)
  })
})
