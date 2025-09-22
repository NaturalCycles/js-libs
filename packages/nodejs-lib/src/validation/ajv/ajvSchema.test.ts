import { _typeCast, type IsoDate } from '@naturalcycles/js-lib/types'
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

describe('isoDate keyword', () => {
  test('should accept 2001-01-01 ISO date format', () => {
    const date = '2001-01-01'
    const schema = z.isoDate()

    const result = schema.parse(date)
    expect(result).toBe(date)

    const ajvResult = AjvSchema.createFromZod(schema).getValidationResult(date)
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

    const ajvResult = AjvSchema.createFromZod(schema).getValidationResult(date)
    expect(ajvResult[0]).toMatchInlineSnapshot()
    expect(ajvResult[1]).toBe(date)
  })

  test('should accept valid dates when `before` param is defined', () => {
    const date = '2001-01-01' as IsoDate
    const schema = z.isoDate({ before: date })
    const ajvSchema = AjvSchema.createFromZod(schema)

    expect(ajvSchema.getValidationResult('2000-12-30')[0]).toBeNull()
    expect(ajvSchema.getValidationResult('2000-12-31')[0]).toBeNull()
    expect(ajvSchema.getValidationResult('2001-01-01')[0]).toMatchInlineSnapshot(`
      [AjvValidationError: Object should be before 2001-01-01
      Input: 2001-01-01]
    `)
    expect(ajvSchema.getValidationResult('2001-01-02')[0]).toMatchInlineSnapshot(`
      [AjvValidationError: Object should be before 2001-01-01
      Input: 2001-01-02]
    `)
  })

  test('should accept valid dates when `sameOrBefore` param is defined', () => {
    const date = '2001-01-01' as IsoDate
    const schema = z.isoDate({ sameOrBefore: date })
    const ajvSchema = AjvSchema.createFromZod(schema)

    expect(ajvSchema.getValidationResult('2000-12-30')[0]).toBeNull()
    expect(ajvSchema.getValidationResult('2000-12-31')[0]).toBeNull()
    expect(ajvSchema.getValidationResult('2001-01-01')[0]).toBeNull()
    expect(ajvSchema.getValidationResult('2001-01-02')[0]).toMatchInlineSnapshot(`
      [AjvValidationError: Object should be on or before 2001-01-01
      Input: 2001-01-02]
    `)
  })

  test('should accept valid dates when `after` param is defined', () => {
    const date = '2001-01-01' as IsoDate
    const schema = z.isoDate({ after: date })
    const ajvSchema = AjvSchema.createFromZod(schema)

    expect(ajvSchema.getValidationResult('2000-12-30')[0]).toMatchInlineSnapshot(`
      [AjvValidationError: Object should be after 2001-01-01
      Input: 2000-12-30]
    `)
    expect(ajvSchema.getValidationResult('2000-12-31')[0]).toMatchInlineSnapshot(`
      [AjvValidationError: Object should be after 2001-01-01
      Input: 2000-12-31]
    `)
    expect(ajvSchema.getValidationResult('2001-01-01')[0]).toMatchInlineSnapshot(`
      [AjvValidationError: Object should be after 2001-01-01
      Input: 2001-01-01]
    `)
    expect(ajvSchema.getValidationResult('2001-01-02')[0]).toBeNull()
  })

  test('should accept valid dates when `sameOrAfter` param is defined', () => {
    const date = '2001-01-01' as IsoDate
    const schema = z.isoDate({ sameOrAfter: date })
    const ajvSchema = AjvSchema.createFromZod(schema)

    expect(ajvSchema.getValidationResult('2000-12-30')[0]).toMatchInlineSnapshot(`
      [AjvValidationError: Object should be on or after 2001-01-01
      Input: 2000-12-30]
    `)
    expect(ajvSchema.getValidationResult('2000-12-31')[0]).toMatchInlineSnapshot(`
      [AjvValidationError: Object should be on or after 2001-01-01
      Input: 2000-12-31]
    `)
    expect(ajvSchema.getValidationResult('2001-01-01')[0]).toBeNull()
    expect(ajvSchema.getValidationResult('2001-01-02')[0]).toBeNull()
  })

  test('should accept valid dates when `between` param is defined with `[]`', () => {
    const date1 = '2001-01-01' as IsoDate
    const date2 = '2001-01-03' as IsoDate
    const schema = z.isoDate({ between: { min: date1, max: date2, incl: '[]' } })
    const ajvSchema = AjvSchema.createFromZod(schema)

    expect(ajvSchema.getValidationResult('2000-12-30')[0]).toMatchInlineSnapshot(`
      [AjvValidationError: Object should be between 2001-01-01 and 2001-01-03 (incl: [])
      Input: 2000-12-30]
    `)
    expect(ajvSchema.getValidationResult('2000-12-31')[0]).toMatchInlineSnapshot(`
      [AjvValidationError: Object should be between 2001-01-01 and 2001-01-03 (incl: [])
      Input: 2000-12-31]
    `)
    expect(ajvSchema.getValidationResult('2001-01-01')[0]).toBeNull()
    expect(ajvSchema.getValidationResult('2001-01-02')[0]).toBeNull()
    expect(ajvSchema.getValidationResult('2001-01-03')[0]).toBeNull()
    expect(ajvSchema.getValidationResult('2001-01-04')[0]).toMatchInlineSnapshot(`
      [AjvValidationError: Object should be between 2001-01-01 and 2001-01-03 (incl: [])
      Input: 2001-01-04]
    `)
  })

  test('should accept valid dates when `between` param is defined with `[)`', () => {
    const date1 = '2001-01-01' as IsoDate
    const date2 = '2001-01-03' as IsoDate
    const schema = z.isoDate({ between: { min: date1, max: date2, incl: '[)' } })
    const ajvSchema = AjvSchema.createFromZod(schema)

    expect(ajvSchema.getValidationResult('2000-12-30')[0]).toMatchInlineSnapshot(`
      [AjvValidationError: Object should be between 2001-01-01 and 2001-01-03 (incl: [))
      Input: 2000-12-30]
    `)
    expect(ajvSchema.getValidationResult('2000-12-31')[0]).toMatchInlineSnapshot(`
      [AjvValidationError: Object should be between 2001-01-01 and 2001-01-03 (incl: [))
      Input: 2000-12-31]
    `)
    expect(ajvSchema.getValidationResult('2001-01-01')[0]).toBeNull()
    expect(ajvSchema.getValidationResult('2001-01-02')[0]).toBeNull()
    expect(ajvSchema.getValidationResult('2001-01-03')[0]).toMatchInlineSnapshot(`
      [AjvValidationError: Object should be between 2001-01-01 and 2001-01-03 (incl: [))
      Input: 2001-01-03]
    `)
    expect(ajvSchema.getValidationResult('2001-01-04')[0]).toMatchInlineSnapshot(`
      [AjvValidationError: Object should be between 2001-01-01 and 2001-01-03 (incl: [))
      Input: 2001-01-04]
    `)
  })
})
