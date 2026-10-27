/* oxlint-disable @typescript-eslint/explicit-function-return-type */

import { MOCK_TS_2018_06_21 } from '@naturalcycles/dev-lib/testing/time'
import { _enum } from '@naturalcycles/js-lib'
import { localDate, localTime } from '@naturalcycles/js-lib/datetime'
import { Set2 } from '@naturalcycles/js-lib/object'
import { _stringify } from '@naturalcycles/js-lib/string'
import type {
  AnyObject,
  BaseDBEntity,
  Branded,
  IANATimezone,
  IsoDate,
  IsoDateTime,
  IsoMonth,
  StringMap,
  UnixTimestamp,
  UnixTimestampMillis,
} from '@naturalcycles/js-lib/types'
import { describe, expect, expectTypeOf, it } from 'vitest'
import type { JSchema } from './jSchema.js'
import { AjvSchema, HIDDEN_AJV_SCHEMA, j } from './jSchema.js'

describe('immutability', () => {
  it('should return a new instance for each chained rule', () => {
    const schema1 = j.string()
    const schema2 = schema1.minLength(1)
    const schema3 = schema2.maxLength(2)

    expect(schema1).not.toBe(schema2)
    expect(schema2).not.toBe(schema3)
  })
})

describe('any', () => {
  it('should accept any value', () => {
    const schema = j.any()

    const validCases: any[] = ['hello', 42, true, null, { a: 1 }, [1, 2], undefined]
    validCases.forEach(value => {
      const [err] = schema.getValidationResult(value)
      expect(err, _stringify(value)).toBeNull()
    })
  })
})

describe('string', () => {
  it('should accept a string and infer the string type', () => {
    const schema = j.string()

    const [err, result] = schema.getValidationResult('foo')

    expect(err).toBeNull()
    expect(result).toBe('foo')
    expectTypeOf(result).toEqualTypeOf<string>()
  })

  describe('nullable', () => {
    it('should accept both strings and null', () => {
      const schema = j.string().nullable()

      const [err1] = schema.getValidationResult('hello')
      expect(err1).toBeNull()

      const [err2] = schema.getValidationResult(null)
      expect(err2).toBeNull()
    })

    it('should reject non-string, non-null values', () => {
      const schema = j.string().nullable()

      const invalidCases: any[] = [42, true, {}, []]
      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, _stringify(value)).not.toBeNull()
      })
    })
  })

  describe('optional(values)', () => {
    it('should convert specific values to `undefined`', () => {
      const schema = j.object<{ foo?: string }>({ foo: j.string().optional(['abcd']) })

      const [err1, result1] = schema.getValidationResult({ foo: 'foo' })

      expect(err1).toBeNull()
      expect(result1).toEqual({ foo: 'foo' })

      const [err2, result2] = schema.getValidationResult({ foo: 'abcd' })

      expect(err2).toBeNull()
      expect(result2).toEqual({})

      const [err3, result3] = schema.getValidationResult({})

      expect(err3).toBeNull()
      expect(result3).toEqual({})

      const [err4, result4] = schema.getValidationResult({ foo: undefined })

      expect(err4).toBeNull()
      expect(result4).toEqual({})
    })

    it('should convert `null` to `undefined`', () => {
      const schema = j.object<{ foo?: string }>({ foo: j.string().optional([null]) })

      const [err1, result1] = schema.getValidationResult({ foo: 'foo' })
      expect(err1).toBeNull()
      expect(result1).toEqual({ foo: 'foo' })

      const [err2, result2] = schema.getValidationResult({ foo: null })
      expect(err2).toBeNull()
      expect(result2).toEqual({ foo: undefined })
    })

    it('should not allow chaining after `optional([null])` (compile-time error)', () => {
      const schema = j.string().optional([null])
      // When `null` is included in optionalValues, the return type is JsonSchemaTerminal,
      // which doesn't have string-specific methods like minLength().
      // This prevents mistakes at compile time rather than failing at runtime.
      // @ts-expect-error That's the purpose of the test, that's why we have the expect error. - minLength doesn't exist on JsonSchemaTerminal
      expect(() => schema.minLength(1)).toThrow(TypeError)
    })

    it('should throw when used on a standalone schema (and not in an object/array)', () => {
      const schema = j.string().optional(['foo'])
      const ajvSchema = AjvSchema.create(schema)

      expect(() => ajvSchema.isValid('asdf')).toThrowErrorMatchingInlineSnapshot(
        `[AssertionError: You should only use \`optional([x, y, z])\` on a property of an object, or on an element of an array due to Ajv mutation issues.]`,
      )
    })

    it('should still be an optional field when passing in `null`', () => {
      const schema = j.object<{ foo?: string }>({ foo: j.string().optional([null]) })

      const [err1, result1] = schema.getValidationResult({})
      expect(err1).toBeNull()
      expect(result1).toEqual({})
    })

    it('should convert `null` to `undefined` after a `nullable()` call', () => {
      const schema = j.object<{ foo?: string | null }>({
        foo: j.string().nullable().optional([null]),
      })

      const [err1, result1] = schema.getValidationResult({ foo: 'foo' })
      expect(err1).toBeNull()
      expect(result1).toEqual({ foo: 'foo' })

      const [err2, result2] = schema.getValidationResult({ foo: null })
      expect(err2).toBeNull()
      expect(result2).toEqual({ foo: undefined })
    })

    it('should not mutate the base builder when deriving optional([null]) from nullable()', () => {
      const base = j.string().nullable()

      // Derive two independent optional schemas from the same base
      const schema1 = j.object<{ foo?: string | null }>({ foo: base.optional([null]) })
      const schema2 = j.object<{ foo: string | null }>({ foo: base })

      // schema1 should convert null to undefined
      const [err1, result1] = schema1.getValidationResult({ foo: null })
      expect(err1).toBeNull()
      expect(result1).toEqual({ foo: undefined })

      // schema2 (non-optional) should still accept null as-is
      const [err2, result2] = schema2.getValidationResult({ foo: null })
      expect(err2).toBeNull()
      expect(result2).toEqual({ foo: null })
    })
  })

  describe('regex', () => {
    it('should correctly validate against the regex', () => {
      const schema = j.string().regex(/^[0-9]{2}$/)

      const [err01] = schema.getValidationResult('00')
      expect(err01).toBeNull()
      const [err02] = schema.getValidationResult('01')
      expect(err02).toBeNull()

      const [err11] = schema.getValidationResult('000')
      expect(err11).not.toBeNull()
      const [err12] = schema.getValidationResult('abc')
      expect(err12).not.toBeNull()
    })

    it('should allow setting custom error message', () => {
      const schema = j.string().regex(/^[0-9]{2}$/, { msg: 'is not a valid Oompa-loompa' })

      const [err11] = schema.getValidationResult('000')
      expect(err11).toMatchInlineSnapshot(`
        [AjvValidationError: Object is not a valid Oompa-loompa
        Input: 000]
      `)
    })

    it('should allow setting custom validation name', () => {
      const schema = j.string().regex(/^[0-9]{2}$/, { name: 'Oompa-loompa' })

      const [err11] = schema.getValidationResult('000')
      expect(err11).toMatchInlineSnapshot(`
        [AjvValidationError: Object is not a valid Oompa-loompa
        Input: 000]
      `)
    })

    it('should throw custom error from regex in item schema', () => {
      const itemSchema = j.string().regex(/^foo$/, { msg: 'must be "foo"' })
      const schema = j.array(itemSchema)

      const [err] = schema.getValidationResult(['foo', 'bar', 'baz'])

      expect(err).toMatchInlineSnapshot(`
        [AjvValidationError: Object[1] must be "foo"
        Got: bar
        Object[2] must be "foo"
        Got: baz
        Input: [ 'foo', 'bar', 'baz' ]]
      `)
    })

    it('should throw custom error from regex in property schema of object nested in item schema', () => {
      interface Item {
        name: string
      }

      const itemSchema = j.object<Item>({
        name: j.string().regex(/^foo$/, { msg: 'must be "foo"' }),
      })
      const schema = j.array(itemSchema)

      const [err] = schema.getValidationResult([{ name: 'foo' }, { name: 'bar' }])

      expect(err).toMatchInlineSnapshot(`
        [AjvValidationError: Object[1].name must be "foo"
        Got: bar
        Input: [ { name: 'foo' }, { name: 'bar' } ]]
      `)
    })

    it('should not print the regex in the error message', () => {
      const schema = j.string().regex(/\D+/)

      const [err] = schema.getValidationResult('42')
      expect(err).toMatchInlineSnapshot(`
        [AjvValidationError: Object is not matching the expected pattern
        Input: 42]
      `)
    })
  })

  describe('pattern', () => {
    it('should correctly validate against the pattern', () => {
      const schema = j.string().pattern('^[0-9]{2}$')

      const [err01] = schema.getValidationResult('00')
      expect(err01).toBeNull()
      const [err02] = schema.getValidationResult('01')
      expect(err02).toBeNull()

      const [err11] = schema.getValidationResult('000')
      expect(err11).not.toBeNull()
      const [err12] = schema.getValidationResult('abc')
      expect(err12).not.toBeNull()
    })

    it('should throw custom error from pattern in property schema', () => {
      interface Foo {
        foo: string
      }

      const schema = j.object<Foo>({
        foo: j.string().pattern('^abc$', { msg: 'must equal "abc"' }),
      })

      const [err] = schema.getValidationResult({ foo: 'def' })

      expect(err).toMatchInlineSnapshot(`
        [AjvValidationError: Object.foo must equal "abc"
        Got: def
        Input: { foo: 'def' }]
      `)
    })

    it('should throw custom error from pattern in nested property schema', () => {
      interface Foo {
        foo: {
          bar: string
        }
      }

      const schema = j.object<Foo>({
        foo: j.object.infer({
          bar: j.string().pattern('^abc$', { msg: 'must equal "abc"' }),
        }),
      })

      const [err] = schema.getValidationResult({ foo: { bar: 'def' } })

      expect(err).toMatchInlineSnapshot(`
        [AjvValidationError: Object.foo.bar must equal "abc"
        Got: def
        Input: { foo: { bar: 'def' } }]
      `)
    })

    it('should throw custom error from pattern in object with number keys', () => {
      interface Foo {
        1: string
      }

      const schema = j.object<Foo>({
        1: j.string().pattern('^abc$', { msg: 'must equal "abc"' }),
      })

      const [err] = schema.getValidationResult({ 1: 'def' })

      expect(err).toMatchInlineSnapshot(`
        [AjvValidationError: Object[1] must equal "abc"
        Got: def
        Input: { '1': 'def' }]
      `)
    })

    it('should not print the pattern in the error message', () => {
      const schema = j.string().pattern(String.raw`\D+`)

      const [err] = schema.getValidationResult('42')
      expect(err).toMatchInlineSnapshot(`
        [AjvValidationError: Object is not matching the expected pattern
        Input: 42]
      `)
    })
  })

  describe('minLength', () => {
    it('should correctly validate the minimum length of the string', () => {
      const schema = j.string().minLength(5)

      const [err01] = schema.getValidationResult('01234')
      expect(err01).toBeNull()
      const [err02] = schema.getValidationResult('012345')
      expect(err02).toBeNull()

      const [err11] = schema.getValidationResult('0123')
      expect(err11).not.toBeNull()
    })
  })

  describe('maxLength', () => {
    it('should correctly validate the maximum length of the string', () => {
      const schema = j.string().maxLength(5)

      const [err01] = schema.getValidationResult('0123')
      expect(err01).toBeNull()
      const [err02] = schema.getValidationResult('01234')
      expect(err02).toBeNull()

      const [err11] = schema.getValidationResult('012345')
      expect(err11).not.toBeNull()
    })
  })

  describe('length(min, max)', () => {
    it('should correctly validate the length of the string', () => {
      const schema = j.string().length(4, 5)

      const [err01] = schema.getValidationResult('0123')
      expect(err01).toBeNull()
      const [err02] = schema.getValidationResult('01234')
      expect(err02).toBeNull()

      const [err11] = schema.getValidationResult('012')
      expect(err11).not.toBeNull()
      const [err12] = schema.getValidationResult('012345')
      expect(err12).not.toBeNull()
    })
  })

  describe('length(eq)', () => {
    it('should correctly validate the length of the string', () => {
      const schema = j.string().length(4)

      const [err01] = schema.getValidationResult('0123')
      expect(err01).toBeNull()

      const [err02] = schema.getValidationResult('01234')
      expect(err02).not.toBeNull()
      const [err11] = schema.getValidationResult('012')
      expect(err11).not.toBeNull()
      const [err12] = schema.getValidationResult('012345')
      expect(err12).not.toBeNull()
    })
  })

  describe('trim', () => {
    it('should trim the input string - when inside an object schema', () => {
      const schema = j.object.infer({ trim: j.string().trim() }).isOfType<{ trim: string }>()

      const [err, result] = schema.getValidationResult({
        trim: '  trimmed  string  ',
      })

      expect(err).toBeNull()
      expect(result.trim).toBe('trimmed  string')
    })

    it('should trim the input string - when inside an array schema', () => {
      const schema = j.array(j.string().trim())

      const [err, result] = schema.getValidationResult(['  trimmed  string  '])

      expect(err).toBeNull()
      expect(result[0]).toBe('trimmed  string')
    })

    it('should silently fail when not inside a parent schema', () => {
      const schema = j.string().trim()

      const [err, result] = schema.getValidationResult('  trimmed  string  ')

      expect(err).toBeNull()
      expect(result).toBe('  trimmed  string  ')
    })
  })

  describe('toLowerCase', () => {
    it('should toLowerCase the input string - when inside an object schema', () => {
      const schema = j.object
        .infer({ toLowerCase: j.string().toLowerCase() })
        .isOfType<{ toLowerCase: string }>()

      const [err, result] = schema.getValidationResult({
        toLowerCase: 'lOwErCaSe StRiNg',
      })

      expect(err).toBeNull()
      expect(result.toLowerCase).toBe('lowercase string')
    })

    it('should toLowerCase the input string - when inside an array schema', () => {
      const schema = j.array(j.string().toLowerCase())

      const [err, result] = schema.getValidationResult(['lOwErCaSe StRiNg'])

      expect(err).toBeNull()
      expect(result[0]).toBe('lowercase string')
    })

    it('should silently fail when not inside a parent schema', () => {
      const schema = j.string().toLowerCase()

      const [err, result] = schema.getValidationResult('lOwErCaSe StRiNg')

      expect(err).toBeNull()
      expect(result).toBe('lOwErCaSe StRiNg')
    })
  })

  describe('toUpperCase', () => {
    it('should toUpperCase the input string - when inside an object schema', () => {
      const schema = j.object
        .infer({ toUpperCase: j.string().toUpperCase() })
        .isOfType<{ toUpperCase: string }>()

      const [err, result] = schema.getValidationResult({
        toUpperCase: 'UpPeRcAsE StRiNg',
      })

      expect(err).toBeNull()
      expect(result.toUpperCase).toBe('UPPERCASE STRING')
    })

    it('should toUpperCase the input string - when inside an array schema', () => {
      const schema = j.array(j.string().toUpperCase())

      const [err, result] = schema.getValidationResult(['UpPeRcAsE StRiNg'])

      expect(err).toBeNull()
      expect(result[0]).toBe('UPPERCASE STRING')
    })

    it('should silently fail when not inside a parent schema', () => {
      const schema = j.string().toUpperCase()

      const [err, result] = schema.getValidationResult('UpPeRcAsE StRiNg')

      expect(err).toBeNull()
      expect(result).toBe('UpPeRcAsE StRiNg')
    })
  })

  describe('truncate', () => {
    it('should truncate the input string - when inside an object schema', () => {
      const schema = j.object
        .infer({ truncate: j.string().truncate(5) })
        .isOfType<{ truncate: string }>()

      const [err, result] = schema.getValidationResult({
        truncate: '0123456',
      })

      expect(err).toBeNull()
      expect(result.truncate).toBe('01234')
    })

    it('should truncate the input string - when inside an array schema', () => {
      const schema = j.array(j.string().truncate(5))

      const [err, result] = schema.getValidationResult(['0123456'])

      expect(err).toBeNull()
      expect(result[0]).toBe('01234')
    })

    it('should silently fail when not inside a parent schema', () => {
      const schema = j.string().truncate(5)

      const [err, result] = schema.getValidationResult('0123456')

      expect(err).toBeNull()
      expect(result).toBe('0123456')
    })

    it('should trim the result when trim is part of the chain', () => {
      const schema = j.object
        .infer({ truncate: j.string().trim().truncate(5) })
        .isOfType<{ truncate: string }>()

      const [err, result] = schema.getValidationResult({
        truncate: '  01234 56  ',
      })

      expect(err).toBeNull()
      expect(result.truncate).toBe('01234')
    })
  })

  describe('branded', () => {
    it('should accept a branded string and infer the branded type', () => {
      type AccountId = Branded<string, 'AccountId'>
      const schema = j.string().branded<AccountId>()

      const input = 'AccountId' as AccountId
      const [err, result] = schema.getValidationResult(input)

      expect(err).toBeNull()
      expect(result).toBe(input)
      expectTypeOf(result).toEqualTypeOf<typeof input>()
    })
  })

  describe('email', () => {
    it('should accept valid email addresses', () => {
      const testCases: string[] = [
        'david@nc.se',
        'paul-louis@nc.co.uk',
        'kamalaharris@gmail.com',
        'kamalaharris@gmail.com ', // trailing spaces should not cause an error, note: we can't mutate primitives
      ]
      const schema = j.string().email()

      testCases.forEach(email => {
        const [err, value] = schema.getValidationResult(email)
        expect(err, email).toBeNull()
        expect(value, email).toBe(email)
      })
    })

    it('should reject invalid email address', () => {
      const schema = j.string().email()

      const invalidTestCases: any[] = [
        'karius',
        'karius@tandtroll',
        'karius@tandtroll.neverland',
        0,
        true,
        [],
        {},
      ]

      invalidTestCases.forEach(email => {
        const [err] = schema.getValidationResult(email)
        expect(err).not.toBeNull()
      })
    })

    it('should trim the email when it`s wrapped in an object or array', () => {
      const schema1 = j.object<{ email: string }>({ email: j.string().email() })

      const [err1, value1] = schema1.getValidationResult({ email: '  kamalaharris@gmail.com ' }) // em space
      expect(err1).toBeNull()
      expect(value1).toEqual({ email: 'kamalaharris@gmail.com' })

      const schema2 = j.array(j.string().email())

      const [err2, value2] = schema2.getValidationResult(['kamalaharris@gmail.com ']) // em space
      expect(err2).toBeNull()
      expect(value2).toEqual(['kamalaharris@gmail.com'])
    })

    it('should lowercase the email when it`s wrapped in an object or array', () => {
      const schema1 = j.object<{ email: string }>({ email: j.string().email() })

      const [err1, value1] = schema1.getValidationResult({ email: 'KAMALAHARRIS@gmail.COM' })
      expect(err1).toBeNull()
      expect(value1).toEqual({ email: 'kamalaharris@gmail.com' })

      const schema2 = j.array(j.string().email())

      const [err2, value2] = schema2.getValidationResult(['KAMALAHARRIS@gmail.com'])
      expect(err2).toBeNull()
      expect(value2).toEqual(['kamalaharris@gmail.com'])
    })

    it('should produce a readable error message', () => {
      const schema = j.string().email()

      const [err1] = schema.getValidationResult('karius@tandtroll.con')
      expect(err1).toMatchInlineSnapshot(`
        [AjvValidationError: Object has an invalid TLD
        Input: karius@tandtroll.con]
      `)

      const [err2] = schema.getValidationResult('kamal>aharris@gmail.com')
      expect(err2).toMatchInlineSnapshot(`
        [AjvValidationError: Object is not a valid email address
        Input: kamal>aharris@gmail.com]
      `)
    })

    it('should convert an empty string to `undefined` with optional(values)', () => {
      const schema = j.object<{ foo?: string }>({ foo: j.string().email().optional(['']) })

      const [err1, result1] = schema.getValidationResult({ foo: 'foo@boo.com' })
      expect(err1).toBeNull()
      expect(result1).toEqual({ foo: 'foo@boo.com' })

      const [err2, result2] = schema.getValidationResult({ foo: '' })
      expect(err2).toBeNull()
      expect(result2).toEqual({ foo: undefined })

      const [err3, result3] = schema.getValidationResult({})
      expect(err3).toBeNull()
      expect(result3).toEqual({})
    })
  })

  describe('the checkTLD option', () => {
    it('should validate the TLD part strictly by default', () => {
      const schema = j.string().email()

      const [err01] = schema.getValidationResult('david@nc.se')
      expect(err01).toBeNull()
      const [err02] = schema.getValidationResult('david@very.cool')
      expect(err02).toBeNull()

      const [err11] = schema.getValidationResult('kirill@nc.gizmo')
      expect(err11).toMatchInlineSnapshot(`
        [AjvValidationError: Object has an invalid TLD
        Input: kirill@nc.gizmo]
      `)
    })

    it('should not validate the TLD part strictly when `checkTLD` is `false`', () => {
      const schema = j.string().email({ checkTLD: false })

      const [err01] = schema.getValidationResult('david@nc.se')
      expect(err01).toBeNull()
      const [err02] = schema.getValidationResult('david@very.cool')
      expect(err02).toBeNull()

      const [err11] = schema.getValidationResult('kirill@nc.gizmo')
      expect(err11).toBeNull()
    })
  })

  describe('IsoDate', () => {
    it('should accept an IsoDate and infer the IsoDate type', () => {
      const schema = j.string().isoDate()

      const [err, result] = schema.getValidationResult('2025-10-15')

      expect(err).toBeNull()
      expect(result).toBe('2025-10-15')
      expectTypeOf(result).toEqualTypeOf<IsoDate>()
    })

    it('should reject with proper error message', () => {
      const schema = j.string().isoDate()

      const [err] = schema.getValidationResult(
        'Second day of the second month of the year of the snake',
      )

      expect(err).toMatchInlineSnapshot(`
        [AjvValidationError: Object is an invalid IsoDate
        Input: Second day of the second month of the year of the snake]
      `)
    })

    it('should accept valid data', () => {
      const testCases = ['2001-01-01', '1984-02-29', '2026-08-08', '2000-02-29']
      const d = localDate.fromString('2001-01-01' as IsoDate)
      for (let i = 1; i < 366; ++i) {
        testCases.push(d.plusDays(i).toISODate())
      }
      const schema = j.string().isoDate()

      testCases.forEach(date => {
        const [err] = schema.getValidationResult(date)
        expect(err, date).toBeNull()
      })
    })

    it('should reject invalid data', () => {
      const invalidCases: any[] = [
        'abcd',
        '0-0-0',
        '20250930', // valid ISO6801 but we don't support it
        '2025-W40-2', // valid ISO6801 but we don't support it
        '2025‐273', // valid ISO6801 but we don't support it
        '20010-01-01', // 5 digit year
        '2001-13-01', // invalid month
        '2001-01-32', // invalid day
        '1984-02-30', // invalid day for february
        '1985-02-29', // invalid day for for february in non leap-year
        '2001-04-31', // invalid day for 30 day month
        '2001-06-31', // invalid day for 30 day month
        '2001-09-31', // invalid day for 30 day month
        '2001-11-31', // invalid day for 30 day month
        '2100-02-29', // not leap year b/c div. by 100 but not div. by 400
        '20/6-08-27',
        '2026-1/-15',
        '2026-0:-01',
        '2026-08-2/',
        '2026-08-2 ',
        0,
        false,
        {},
        [],
      ]
      const schema = j.string().isoDate()

      invalidCases.forEach(date => {
        const [err] = schema.getValidationResult(date)
        expect(err, String(date)).not.toBeNull()
      })
    })

    describe('optional(values)', () => {
      it('should convert `null` to `undefined`', () => {
        const schema = j.object<{ date?: IsoDate }>({ date: j.string().isoDate().optional([null]) })

        const [err1, result1] = schema.getValidationResult({ date: '2025-01-15' as IsoDate })
        expect(err1).toBeNull()
        expect(result1).toEqual({ date: '2025-01-15' })

        const [err2, result2] = schema.getValidationResult({ date: null })
        expect(err2).toBeNull()
        expect(result2).toEqual({ date: undefined })
      })

      it('should still be an optional field when passing in `null`', () => {
        const schema = j.object<{ date?: IsoDate }>({ date: j.string().isoDate().optional([null]) })

        const [err1, result1] = schema.getValidationResult({})
        expect(err1).toBeNull()
        expect(result1).toEqual({})
      })
    })

    describe('before', () => {
      it('should accept only dates before the limit', () => {
        const testCases: any[] = ['2018-06-20']
        const schema = j.string().isoDate().before('2018-06-21')

        testCases.forEach(date => {
          const [err] = schema.getValidationResult(date)
          expect(err, String(date)).toBeNull()
        })

        const invalidCases: any[] = ['2018-06-21', '2018-06-22']

        invalidCases.forEach(date => {
          const [err] = schema.getValidationResult(date)
          expect(err, String(date)).not.toBeNull()
        })
      })

      it('should reject any date when the limit is not a valid IsoDate', () => {
        const schema = j.string().isoDate().before('abcd')
        const [err] = schema.getValidationResult('2018-06-21')
        expect(err).toMatchInlineSnapshot(`
          [AjvValidationError: Object is not before abcd
          Input: 2018-06-21]
        `)
      })
    })

    describe('sameOrBefore', () => {
      it('should accept only dates on or before the limit', () => {
        const testCases: any[] = ['2018-06-20', '2018-06-21']
        const schema = j.string().isoDate().sameOrBefore('2018-06-21')

        testCases.forEach(date => {
          const [err] = schema.getValidationResult(date)
          expect(err, String(date)).toBeNull()
        })

        const invalidCases: any[] = ['2018-06-22']

        invalidCases.forEach(date => {
          const [err] = schema.getValidationResult(date)
          expect(err, String(date)).not.toBeNull()
        })
      })

      it('should reject any date when the limit is not a valid IsoDate', () => {
        const schema = j.string().isoDate().sameOrBefore('abcd')
        const [err] = schema.getValidationResult('2018-06-21')
        expect(err).toMatchInlineSnapshot(`
          [AjvValidationError: Object is not the same or before abcd
          Input: 2018-06-21]
        `)
      })
    })

    describe('after', () => {
      it('should accept only dates after the limit', () => {
        const testCases: any[] = ['2018-06-22']
        const schema = j.string().isoDate().after('2018-06-21')

        testCases.forEach(date => {
          const [err] = schema.getValidationResult(date)
          expect(err, String(date)).toBeNull()
        })

        const invalidCases: any[] = ['2018-06-20', '2018-06-21']

        invalidCases.forEach(date => {
          const [err] = schema.getValidationResult(date)
          expect(err, String(date)).not.toBeNull()
        })
      })

      it('should reject any date when the limit is not a valid IsoDate', () => {
        const schema = j.string().isoDate().after('abcd')
        const [err] = schema.getValidationResult('2018-06-21')
        expect(err).toMatchInlineSnapshot(`
          [AjvValidationError: Object is not after abcd
          Input: 2018-06-21]
        `)
      })
    })

    describe('sameOrAfter', () => {
      it('should accept only dates on or after the limit', () => {
        const testCases: any[] = ['2018-06-21', '2018-06-22']
        const schema = j.string().isoDate().sameOrAfter('2018-06-21')

        testCases.forEach(date => {
          const [err] = schema.getValidationResult(date)
          expect(err, String(date)).toBeNull()
        })

        const invalidCases: any[] = ['2018-06-20']

        invalidCases.forEach(date => {
          const [err] = schema.getValidationResult(date)
          expect(err, String(date)).not.toBeNull()
        })
      })

      it('should reject any date when the limit is not a valid IsoDate', () => {
        const schema = j.string().isoDate().sameOrAfter('abcd')
        const [err] = schema.getValidationResult('2018-06-21')
        expect(err).toMatchInlineSnapshot(`
          [AjvValidationError: Object is not the same or after abcd
          Input: 2018-06-21]
        `)
      })
    })

    describe('between', () => {
      it('should accept only dates within an inclusive [] range', () => {
        const testCases: any[] = ['2018-06-20', '2018-06-21', '2018-06-22']
        const schema = j.string().isoDate().between('2018-06-20', '2018-06-22', '[]')

        testCases.forEach(date => {
          const [err] = schema.getValidationResult(date)
          expect(err, String(date)).toBeNull()
        })

        const invalidCases: any[] = ['2018-06-19', '2018-06-23']

        invalidCases.forEach(date => {
          const [err] = schema.getValidationResult(date)
          expect(err, String(date)).not.toBeNull()
        })
      })

      it('should include the start and exclude the end with [)', () => {
        const schema = j.string().isoDate().between('2018-06-20', '2018-06-22', '[)')

        const validCases: any[] = ['2018-06-20', '2018-06-21']
        validCases.forEach(date => {
          const [err] = schema.getValidationResult(date)
          expect(err, String(date)).toBeNull()
        })

        const invalidCases: any[] = ['2018-06-19', '2018-06-22', '2018-06-23']
        invalidCases.forEach(date => {
          const [err] = schema.getValidationResult(date)
          expect(err, String(date)).not.toBeNull()
        })
      })

      it('should reject any date when a range limit is not a valid IsoDate', () => {
        const schema1 = j.string().isoDate().between('abcd', '2018-06-22', '[]')
        const [err1] = schema1.getValidationResult('2018-06-21')
        expect(err1).toMatchInlineSnapshot(`
          [AjvValidationError: Object is not the same or after abcd
          Input: 2018-06-21]
        `)

        const schema2 = j.string().isoDate().between('2018-06-20', 'abcd', '[]')
        const [err2] = schema2.getValidationResult('2018-06-21')
        expect(err2).toMatchInlineSnapshot(`
          [AjvValidationError: Object is not the same or before abcd
          Input: 2018-06-21]
        `)
      })
    })
  })

  describe('IsoDateTime', () => {
    it('should accept an IsoDateTime and infer the IsoDateTime type', () => {
      const schema = j.string().isoDateTime()

      const [err, result] = schema.getValidationResult('2025-10-15T01:01:01Z')

      expect(err).toBeNull()
      expect(result).toBe('2025-10-15T01:01:01Z')
      expectTypeOf(result).toEqualTypeOf<IsoDateTime>()
    })

    it('should reject with proper error message', () => {
      const schema = j.string().isoDateTime()

      const [err] = schema.getValidationResult(
        'Second day of the second month of the year of the snake two candles after sunrise',
      )

      expect(err).toMatchInlineSnapshot(`
        [AjvValidationError: Object is an invalid IsoDateTime
        Input: Second day of the second month of the year of the snake two candles after sunrise]
      `)
    })

    it('should accept valid data', () => {
      const testCases = [
        '2001-01-01T01:01:01',
        '2001-01-01T01:01:01Z',
        '2001-01-01T01:01:01+14:00',
        '2001-01-01T01:01:01-12:00',
        '2000-02-29T01:01:01',
        '2001-01-01T01:01:01.1',
        '2001-01-01T01:01:01.001',
        '2001-01-01T01:01:01.001Z',
        '2001-01-01T01:01:01.001+14:00',
        '2001-01-01T01:01:01.001-12:00',
        '2001-01-01T01:01:01.1000',
        '2026-08-27T06:24:01.231263Z',
        '2001-01-01T01:01:01.123456789Z',
        '2001-01-01T01:01:01.123456789+14:00',
        new Date('2001-01-01T01:01:01Z').toISOString(),
      ]
      const t = localTime.fromIsoDateTimeString('2001-01-01T01:01:01Z' as IsoDateTime)
      for (let i = 1; i < 366; ++i) {
        testCases.push(t.plusDays(i).toISODateTime())
      }
      const schema = j.string().isoDateTime()

      testCases.forEach(date => {
        const [err] = schema.getValidationResult(date)
        expect(err, date).toBeNull()
      })
    })

    it('should reject invalid data', () => {
      const invalidCases = [
        'abcd',
        '20250930T070629Z', // valid ISO6801 but we don't support it
        '2001-01-01T01:01:01,001Z',
        '20010-01-01T01:01:01', // 5 digit year
        '2001-13-01T01:01:01', // invalid month
        '2001-01-32T01:01:01', // invalid day
        '2001-01-01T24:01:01', // invalid hour
        '2001-01-01T01:60:01', // invalid minute
        '2001-01-01T01:01:60', // invalid second
        '2001-01-01T01:01:01.',
        '2001-01-01T01:01:01.Z',
        '2001-01-01T01:01:01.1234567890',
        '2001-01-01T01:01:01.1234567890Z',
        '2001-01-01T01:01:01.12a4Z',
        '2001-01-01T01:01:01.123+15:00',
        '2026-08-2/T06:24:01Z',
        '2026-08-27T1/:24:01Z',
        '2026-08-27T0::24:01Z',
        '2026-08-27T06:2/:01Z',
        '2026-08-27T06:24:1/Z',
        '2026-08-27T06:24:01+1/:00',
        '2026-08-27T06:24:01+01:3/',
        '2001-01-01T01:01:01X', // invalid timezone
        '2001-01-01T01:01:01+15:00', // invalid timezone hour
        '2001-01-01T01:01:01-13:00', // invalid timezone hour
        '2001-01-01T01:01:01-01:60', // invalid timezone minute
        '2001-01-01T01:01:01+14:01', // invalid timezone time, max is +14:00
        '2001-01-01T01:01:01-12:01', // invalid timezone time, min is -12:00
        '1984-02-30T01:01:01', // invalid day for february
        '1985-02-29T01:01:01', // invalid day for for february in non leap-year
        '2001-04-31T01:01:01', // invalid day for 30 day month
        '2001-06-31T01:01:01', // invalid day for 30 day month
        '2001-09-31T01:01:01', // invalid day for 30 day month
        '2001-11-31T01:01:01', // invalid day for 30 day month
        '2100-02-29T01:01:01', // not leap year b/c div. by 100 but not div. by 400
      ]
      const schema = j.string().isoDateTime()

      invalidCases.forEach(date => {
        const [err] = schema.getValidationResult(date)
        expect(err, date).not.toBeNull()
      })
    })
  })

  describe('IsoMonth', () => {
    it('should accept an IsoMonth and infer the IsoMonth type', () => {
      const schema = j.string().isoMonth()

      const [err, result] = schema.getValidationResult('2025-10')

      expect(err).toBeNull()
      expect(result).toBe('2025-10')
      expectTypeOf(result).toEqualTypeOf<IsoMonth>()
    })

    it('should reject with proper error message', () => {
      const schema = j.string().isoMonth()

      const [err] = schema.getValidationResult('Second day of the second month')

      expect(err).toMatchInlineSnapshot(`
        [AjvValidationError: Object is an invalid IsoMonth
        Input: Second day of the second month]
      `)
    })

    it('should accept valid data', () => {
      const testCases: any[] = []
      const d = localDate.fromString('2001-01-01' as IsoDate)
      for (let i = 1; i < 366; ++i) {
        testCases.push(d.plusDays(i).toISOMonth())
      }
      const schema = j.string().isoMonth()

      testCases.forEach(date => {
        const [err] = schema.getValidationResult(date)
        expect(err, String(date)).toBeNull()
      })
    })

    it('should reject invalid data', () => {
      const invalidCases: any[] = [
        'abcd',
        '0-0',
        '202509',
        '20250930',
        '2025-W40-2',
        '2025-13',
        '20/6-01',
        '2026-1/',
        '2026-0:',
        0,
        false,
        {},
        [],
      ]
      const schema = j.string().isoMonth()

      invalidCases.forEach(date => {
        const [err] = schema.getValidationResult(date)
        expect(err, String(date)).not.toBeNull()
      })
    })
  })

  describe('jwt', () => {
    it('should accept string with valid JWT format', () => {
      const testCases = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30',
      ]
      const schema = j.string().jwt()

      testCases.forEach((jwt, i) => {
        const [err] = schema.getValidationResult(jwt)
        expect(err, String(i)).toBeNull()
      })
    })

    it('should reject string with invalid JWT format', () => {
      const invalidCases: any[] = [
        'a',
        // Missing signature part - technically valid JWT, but we do not accept it
        'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTczNjI5MjEyNH0.',
        0,
        true,
        [],
        {},
      ]
      const schema = j.string().jwt()

      invalidCases.forEach((jwt, i) => {
        const [err] = schema.getValidationResult(jwt)
        expect(err, String(i)).not.toBeNull()
      })
    })
  })

  describe('url', () => {
    it('should accept string with valid URL', () => {
      const testCases = ['https://nevergonna.giveyou.up']
      const schema = j.string().url()

      testCases.forEach(url => {
        const [err] = schema.getValidationResult(url)
        expect(err, url).toBeNull()
      })
    })

    it('should reject string with invalid URL', () => {
      const invalidCases: any[] = ['not a URL', 0, true, [], {}]
      const schema = j.string().url()

      invalidCases.forEach(url => {
        const [err] = schema.getValidationResult(url)
        expect(err, String(url)).not.toBeNull()
      })
    })

    it('should reject internationalized domain names (IDN)', () => {
      // IDNs are not supported because JSON Schema patterns don't support regex flags,
      // and the unicode flag is required to match non-ASCII characters.
      // Use punycode encoding (e.g., https://xn--mnchen-3ya.de) instead.
      const idnCases = ['https://münchen.de', 'https://日本.jp', 'https://中国.cn']
      const schema = j.string().url()

      idnCases.forEach(url => {
        const [err] = schema.getValidationResult(url)
        expect(err, `IDN URL should be rejected: ${url}`).not.toBeNull()
      })
    })
  })

  describe('ipv4', () => {
    it('should accept string with valid IPv4', () => {
      const testCases = ['127.0.0.1', '192.168.0.1']
      const schema = j.string().ipv4()

      testCases.forEach(ipv4 => {
        const [err] = schema.getValidationResult(ipv4)
        expect(err, ipv4).toBeNull()
      })
    })

    it('should reject string with invalid IPv4', () => {
      const invalidCases: any[] = ['192.168.0.1/255.255.255.0', 'not a ipv4', 0, true, [], {}]
      const schema = j.string().ipv4()

      invalidCases.forEach(ipv4 => {
        const [err] = schema.getValidationResult(ipv4)
        expect(err, String(ipv4)).not.toBeNull()
      })
    })
  })

  describe('ipv6', () => {
    it('should accept string with valid IPv6', () => {
      const testCases = [
        '2001:0db8:0000:0000:0000:ff00:0042:8329', // lowercase
        '2001:0DB8:0000:0000:0000:FF00:0042:8329', // uppercase
        '2001:db8:0:0:0:ff00:42:8329',
        '2001:db8::ff00:42:8329',
        '0000:0000:0000:0000:0000:0000:0000:0001',
        '::1',
      ]
      const schema = j.string().ipv6()

      testCases.forEach(ipv6 => {
        const [err] = schema.getValidationResult(ipv6)
        expect(err, ipv6).toBeNull()
      })
    })

    it('should reject string with invalid IPv6', () => {
      const invalidCases: any[] = [
        '127.0.0.1',
        '192.168.0.1',
        '192.168.0.1/255.255.255.0',
        'not a ipv6',
        0,
        true,
        [],
        {},
      ]
      const schema = j.string().ipv6()

      invalidCases.forEach(ipv6 => {
        const [err] = schema.getValidationResult(ipv6)
        expect(err, String(ipv6)).not.toBeNull()
      })
    })
  })

  describe('slug', () => {
    it('should accept string with valid slug', () => {
      const testCases = ['some-slug', '012345']
      const schema = j.string().slug()

      testCases.forEach(slug => {
        const [err] = schema.getValidationResult(slug)
        expect(err, slug).toBeNull()
      })
    })

    it('should reject string with invalid slug', () => {
      const invalidCases: any[] = [
        '', // empty
        'no_underscore', // `_`
        'NoCapitalLetters', // capital letter
        0,
        true,
        [],
        {},
      ]
      const schema = j.string().slug()

      invalidCases.forEach(slug => {
        const [err] = schema.getValidationResult(slug)
        expect(err, String(slug)).not.toBeNull()
      })
    })
  })

  describe('semVer', () => {
    it('should accept string with valid semver', () => {
      const testCases = ['0.0.0', '1.2.3']
      const schema = j.string().semVer()

      testCases.forEach(semver => {
        const [err] = schema.getValidationResult(semver)
        expect(err, semver).toBeNull()
      })
    })

    it('should reject string with invalid semver', () => {
      const invalidCases: any[] = [
        '', // empty
        '1.1', // missing part
        '1', // missing part
        '^1', // still not
        'abcd', // text
        0,
        true,
        [],
        {},
      ]
      const schema = j.string().semVer()

      invalidCases.forEach(semver => {
        const [err] = schema.getValidationResult(semver)
        expect(err, String(semver)).not.toBeNull()
      })
    })
  })

  describe('semVer4', () => {
    it('should accept string with valid 4-part semver', () => {
      const testCases = ['0.0.0.0', '1.2.3.4', '10.20.30.40']
      const schema = j.string().semVer4()

      testCases.forEach(semver => {
        const [err] = schema.getValidationResult(semver)
        expect(err, semver).toBeNull()
      })
    })

    it('should reject string with invalid 4-part semver', () => {
      const invalidCases: any[] = [
        '', // empty
        '1.2.3', // missing part
        '1.2', // missing part
        '1', // missing part
        '1.2.3.4.5', // extra part
        '1.2.3.', // trailing dot
        '^1.2.3.4', // still not
        'abcd', // text
        0,
        true,
        [],
        {},
      ]
      const schema = j.string().semVer4()

      invalidCases.forEach(semver => {
        const [err] = schema.getValidationResult(semver)
        expect(err, String(semver)).not.toBeNull()
      })
    })
  })

  describe('languageTag', () => {
    it('should accept string with valid languageTag', () => {
      const testCases = ['hu-HU', 'en-US', 'se-SE', 'se']
      const schema = j.string().languageTag()

      testCases.forEach(languageTag => {
        const [err] = schema.getValidationResult(languageTag)
        expect(err, languageTag).toBeNull()
      })
    })

    it('should reject string with invalid languageTag', () => {
      const invalidCases: any[] = [
        '', // empty
        'en_SE', // `_` instead of `-`
        'abcd', // text
        0,
        true,
        [],
        {},
      ]
      const schema = j.string().languageTag()

      invalidCases.forEach(languageTag => {
        const [err] = schema.getValidationResult(languageTag)
        expect(err, String(languageTag)).not.toBeNull()
      })
    })
  })

  describe('countryCode', () => {
    it('should accept string with valid countryCode', () => {
      const testCases = ['SE', 'HU']
      const schema = j.string().countryCode()

      testCases.forEach(countryCode => {
        const [err] = schema.getValidationResult(countryCode)
        expect(err, countryCode).toBeNull()
      })
    })

    it('should reject string with invalid countryCode', () => {
      const invalidCases: any[] = [
        '', // empty
        'se', // lowercase
        'SWE', // too long
        'abcd', // text
        0,
        true,
        [],
        {},
      ]
      const schema = j.string().countryCode()

      invalidCases.forEach(countryCode => {
        const [err] = schema.getValidationResult(countryCode)
        expect(err, String(countryCode)).not.toBeNull()
      })
    })
  })

  describe('currency', () => {
    it('should accept string with valid currency', () => {
      const testCases = ['SEK', 'HUF', 'EUR', 'USD']
      const schema = j.string().currency()

      testCases.forEach(currency => {
        const [err] = schema.getValidationResult(currency)
        expect(err, currency).toBeNull()
      })
    })

    it('should reject string with invalid currency', () => {
      const invalidCases: any[] = [
        '', // empty
        'huf', // lowercase
        '$', // too fancy
        'abcd', // text
        0,
        true,
        [],
        {},
      ]
      const schema = j.string().currency()

      invalidCases.forEach(currency => {
        const [err] = schema.getValidationResult(currency)
        expect(err, String(currency)).not.toBeNull()
      })
    })
  })

  describe('ianaTimezone', () => {
    it('should accept a timezone and infer the IANATimezone type', () => {
      const schema = j.string().ianaTimezone()

      const [err, result] = schema.getValidationResult('Europe/Stockholm')

      expect(err).toBeNull()
      expect(result).toBe('Europe/Stockholm')
      expectTypeOf(result).toEqualTypeOf<IANATimezone>()
    })

    it('should support "UTC" as we sometimes use it in unit tests', () => {
      const schema = j.string().ianaTimezone()

      const [err] = schema.getValidationResult('UTC')

      expect(err).toBeNull()
    })

    it('should reject with proper error message', () => {
      const schema = j.string().ianaTimezone()

      const [err] = schema.getValidationResult(
        'Second day of the second month of the year of the snake',
      )

      expect(err).toMatchInlineSnapshot(`
        [AjvValidationError: Object is an invalid IANA timezone
        Input: Second day of the second month of the year of the snake]
      `)
    })

    it('should accept valid data', () => {
      // oxlint-disable-next-line no-restricted-globals
      const testCases = Intl.supportedValuesOf('timeZone')
      const schema = j.string().ianaTimezone()

      testCases.forEach(tz => {
        const [err] = schema.getValidationResult(tz)
        expect(err, tz).toBeNull()
      })
    })

    it('should reject invalid data', () => {
      const invalidCases: any[] = ['abcd', 0, null, [], {}]
      const schema = j.string().ianaTimezone()

      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('base64Url', () => {
    it('should accept URL-safe base64 characters and reject others', () => {
      const testCases = ['azAZ09_-']
      const schema = j.string().base64Url()

      testCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, value).toBeNull()
      })

      const invalidCases = ['!', '#', '+', '%', '<']
      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, value).not.toBeNull()
      })
    })
  })

  describe('uuid', () => {
    it('should accept UUIDs in any letter case and reject malformed ones', () => {
      const testCases = [
        '257631be-26d6-4a18-b28e-4bb7c6495cf4', // lowercase
        '257631BE-26D6-4A18-B28E-4BB7C6495CF4', // uppercase (valid per RFC 4122)
        '257631Be-26d6-4A18-b28e-4Bb7c6495Cf4', // mixed case
      ]
      const schema = j.string().uuid()

      testCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, value).toBeNull()
      })

      const invalidCases: any[] = [
        '257631be-26d6-4a18-b28e-4bb7c6495cf4a', // one letter more
        '257631be-26d6-4a18-b28e-4bb7c6495cf', // one letter less
        '257631be-26d6-4a18-b28e-4bb7c6495cf!', // invalid character
        0,
        true,
        [],
        {},
      ]
      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })
})

describe('number', () => {
  it('should accept a number and infer the number type', () => {
    const schema = j.number()

    const [err, result] = schema.getValidationResult(0)

    expect(err).toBeNull()
    expect(result).toBe(0)
    expectTypeOf(result).toEqualTypeOf<number>()
  })

  it('should accept a number with a valid value', () => {
    const testCases = [-2, 0, 2, 3.14]
    const schema = j.number()

    testCases.forEach(value => {
      const [err] = schema.getValidationResult(value)
      expect(err, String(value)).toBeNull()
    })
  })

  it('should reject a number with an invalid value', () => {
    const invalidCases: any[] = [Number.NaN, Number.POSITIVE_INFINITY, 'a', true, {}, []]
    const schema = j.number()

    invalidCases.forEach(value => {
      const [err] = schema.getValidationResult(value)
      expect(err, String(value)).not.toBeNull()
    })
  })

  describe('nullable', () => {
    it('should accept both numbers and null', () => {
      const schema = j.number().nullable()

      const [err1] = schema.getValidationResult(42)
      expect(err1).toBeNull()

      const [err2] = schema.getValidationResult(null)
      expect(err2).toBeNull()
    })

    it('should reject non-number, non-null values', () => {
      const schema = j.number().nullable()

      const invalidCases: any[] = ['abc', true, {}, []]
      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, _stringify(value)).not.toBeNull()
      })
    })
  })

  describe('optional(values)', () => {
    it('should convert specific values to `undefined`', () => {
      const schema = j.object<{ foo?: number }>({ foo: j.number().optional([6147]) })

      const [err1, result1] = schema.getValidationResult({ foo: 1234 })

      expect(err1).toBeNull()
      expect(result1).toEqual({ foo: 1234 })

      const [err2, result2] = schema.getValidationResult({ foo: 6147 })

      expect(err2).toBeNull()
      expect(result2).toEqual({})

      const [err3, result3] = schema.getValidationResult({})

      expect(err3).toBeNull()
      expect(result3).toEqual({})
    })

    it('should convert `null` to `undefined`', () => {
      const schema = j.object<{ foo?: number }>({ foo: j.number().optional([null]) })

      const [err1, result1] = schema.getValidationResult({ foo: 1 })
      expect(err1).toBeNull()
      expect(result1).toEqual({ foo: 1 })

      const [err2, result2] = schema.getValidationResult({ foo: null })
      expect(err2).toBeNull()
      expect(result2).toEqual({ foo: undefined })
    })

    it('should not allow chaining after `optional([null])` (compile-time error)', () => {
      const schema = j.number().optional([null])
      // When `null` is included in optionalValues, the return type is JsonSchemaTerminal,
      // which doesn't have number-specific methods like min().
      // This prevents mistakes at compile time rather than failing at runtime.
      // @ts-expect-error That's the purpose of the test, that's why we have the expect error. - min doesn't exist on JsonSchemaTerminal
      expect(() => schema.min(1)).toThrow(TypeError)
    })

    it('should throw when used on a standalone schema (and not in an object/array)', () => {
      const schema = j.number().optional([112])
      const ajvSchema = AjvSchema.create(schema)

      expect(() => ajvSchema.isValid(2342)).toThrowErrorMatchingInlineSnapshot(
        `[AssertionError: You should only use \`optional([x, y, z])\` on a property of an object, or on an element of an array due to Ajv mutation issues.]`,
      )
    })

    it('should still be an optional field when passing in `null`', () => {
      const schema = j.object<{ foo?: number }>({ foo: j.number().optional([null]) })

      const [err1, result1] = schema.getValidationResult({})
      expect(err1).toBeNull()
      expect(result1).toEqual({})
    })
  })

  describe('multipleOf', () => {
    it('should accept a number with a valid value', () => {
      const testCases = [-2, 0, 2, 4]
      const schema = j.number().multipleOf(2)

      testCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    it('should reject a number with an invalid value', () => {
      const invalidCases = [1, 3]
      const schema = j.number().multipleOf(2)

      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('integer', () => {
    it('should accept integers', () => {
      const testCases = [-2, 0, 1, 100]
      const schema = j.number().integer()

      testCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    it('should reject floats', () => {
      const invalidCases = [1.5, 3.14, -0.1]
      const schema = j.number().integer()

      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('min', () => {
    it('should accept a number with a valid value', () => {
      const testCases = [2, 3, 4]
      const schema = j.number().min(2)

      testCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    it('should reject a number with an invalid value', () => {
      const invalidCases = [1, 1.9999]
      const schema = j.number().min(2)

      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('exclusiveMin', () => {
    it('should accept a number with a valid value', () => {
      const testCases = [2.0001, 3, 4]
      const schema = j.number().exclusiveMin(2)

      testCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    it('should reject a number with an invalid value', () => {
      const invalidCases = [1, 1.9999, 2]
      const schema = j.number().exclusiveMin(2)

      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('max', () => {
    it('should accept a number with a valid value', () => {
      const testCases = [0, 1, 2]
      const schema = j.number().max(2)

      testCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    it('should reject a number with an invalid value', () => {
      const invalidCases = [2.0001, 3, 4]
      const schema = j.number().max(2)

      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('exclusiveMax', () => {
    it('should accept a number with a valid value', () => {
      const testCases = [0, 1, 1.9999]
      const schema = j.number().exclusiveMax(2)

      testCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    it('should reject a number with an invalid value', () => {
      const invalidCases = [2, 3, 4]
      const schema = j.number().exclusiveMax(2)

      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('moreThanOrEqual', () => {
    it('should accept a number with a valid value', () => {
      const testCases = [2, 3, 4]
      const schema = j.number().moreThanOrEqual(2)

      testCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    it('should reject a number with an invalid value', () => {
      const invalidCases = [1, 1.9999]
      const schema = j.number().moreThanOrEqual(2)

      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('moreThan', () => {
    it('should accept a number with a valid value', () => {
      const testCases = [2.0001, 3, 4]
      const schema = j.number().moreThan(2)

      testCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    it('should reject a number with an invalid value', () => {
      const invalidCases = [1, 1.9999, 2]
      const schema = j.number().moreThan(2)

      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('lessThanOrEqual', () => {
    it('should accept a number with a valid value', () => {
      const testCases = [0, 1, 2]
      const schema = j.number().lessThanOrEqual(2)

      testCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    it('should reject a number with an invalid value', () => {
      const invalidCases = [2.0001, 3, 4]
      const schema = j.number().lessThanOrEqual(2)

      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('lessThan', () => {
    it('should accept a number with a valid value', () => {
      const testCases = [0, 1, 1.9999]
      const schema = j.number().lessThan(2)

      testCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    it('should reject a number with an invalid value', () => {
      const invalidCases = [2, 3, 4]
      const schema = j.number().lessThan(2)

      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('equal', () => {
    it('should accept a number with a valid value', () => {
      const testCases = [2]
      const schema = j.number().equal(2)

      testCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    it('should reject a number with an invalid value', () => {
      const invalidCases = [1.9, 2.1]
      const schema = j.number().equal(2)

      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('range', () => {
    describe('[]', () => {
      it('should accept a number with a valid value', () => {
        const testCases = [2, 2.5, 3]
        const schema = j.number().range(2, 3, '[]')

        testCases.forEach(value => {
          const [err] = schema.getValidationResult(value)
          expect(err, String(value)).toBeNull()
        })
      })

      it('should reject a number with an invalid value', () => {
        const invalidCases = [1, 1.999, 3.001, 4]
        const schema = j.number().range(2, 3, '[]')

        invalidCases.forEach(value => {
          const [err] = schema.getValidationResult(value)
          expect(err, String(value)).not.toBeNull()
        })
      })
    })

    describe('[)', () => {
      it('should accept a number with a valid value', () => {
        const testCases = [2, 2.5, 2.9]
        const schema = j.number().range(2, 3, '[)')

        testCases.forEach(value => {
          const [err] = schema.getValidationResult(value)
          expect(err, String(value)).toBeNull()
        })
      })

      it('should reject a number with an invalid value', () => {
        const invalidCases = [1, 1.999, 3, 3.001, 4]
        const schema = j.number().range(2, 3, '[)')

        invalidCases.forEach(value => {
          const [err] = schema.getValidationResult(value)
          expect(err, String(value)).not.toBeNull()
        })
      })
    })
  })

  describe('int32', () => {
    it('should accept a number with a valid value', () => {
      const testCases = [-(2 ** 31), 0, 2 ** 31 - 1]
      const schema = j.number().int32()

      testCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    it('should reject a number with an invalid value', () => {
      const invalidCases = [-(2 ** 31) - 1, 2 ** 31]
      const schema = j.number().int32()

      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })

    it('should not update already set min or max within valid boundaries', () => {
      const testCases = [2, 3]
      const schema = j.number().min(2).max(3).int32()

      testCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })

      const invalidCases = [1, 4]
      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('int64', () => {
    it('should accept a number with a valid value', () => {
      const testCases = [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]
      const schema = j.number().int64()

      testCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    it('should reject a number with an invalid value', () => {
      const invalidCases = [Number.MIN_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER + 1]
      const schema = j.number().int64()

      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  // empty, because float is all JS numbers
  // describe('float', () => {})

  // empty, because double is all JS numbers
  // describe('double', () => {})

  describe('unixTimestamp', () => {
    it('should brand the value', () => {
      const schema = j.number().unixTimestamp()

      const input = 0 as UnixTimestamp
      const [, result] = schema.getValidationResult(input)
      expectTypeOf(result).toEqualTypeOf<typeof input>()
    })

    it('should accept any integer, including negative and post-2500 values', () => {
      const testCases: UnixTimestamp[] = [
        localTime('1900-01-01T00:00:00Z' as IsoDateTime).unix,
        -1 as UnixTimestamp,
        0 as UnixTimestamp,
        localTime('2000-01-01T00:00:00Z' as IsoDateTime).unix,
        localTime('2500-01-01T00:00:00Z' as IsoDateTime).unix,
        localTime('2500-01-01T00:00:00Z' as IsoDateTime).plusSeconds(1).unix,
      ]
      const schema = j.number().unixTimestamp()

      testCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    it('should reject a non-integer value', () => {
      const invalidCases = [-0.5, 0.1, 1.5]
      const schema = j.number().unixTimestamp()

      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('unixTimestamp2000', () => {
    it('should brand the value', () => {
      const schema = j.number().unixTimestamp2000()

      const input = 0 as UnixTimestamp
      const [, result] = schema.getValidationResult(input)
      expectTypeOf(result).toEqualTypeOf<typeof input>()
    })

    it('should accept a number with a valid value', () => {
      const testCases: UnixTimestamp[] = [
        localTime('2000-01-01T00:00:00Z' as IsoDateTime).unix,
        localTime('2500-01-01T00:00:00Z' as IsoDateTime).unix,
      ]
      const schema = j.number().unixTimestamp2000()

      testCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    it('should reject a number with an invalid value', () => {
      const invalidCases = [
        localTime('2000-01-01T00:00:00Z' as IsoDateTime).minusSeconds(1).unix,
        localTime('2500-01-01T00:00:00Z' as IsoDateTime).plusSeconds(1).unix,
        0.1,
      ]
      const schema = j.number().unixTimestamp2000()

      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('unixTimestampMillis', () => {
    it('should brand the value', () => {
      const schema = j.number().unixTimestampMillis()

      const input = 0 as UnixTimestampMillis
      const [, result] = schema.getValidationResult(input)
      expectTypeOf(result).toEqualTypeOf<typeof input>()
    })

    it('should accept any integer, including negative and post-2500 values', () => {
      const testCases: UnixTimestampMillis[] = [
        localTime('1900-01-01T00:00:00Z' as IsoDateTime).unixMillis,
        -1 as UnixTimestampMillis,
        0 as UnixTimestampMillis,
        localTime('2000-01-01T00:00:00Z' as IsoDateTime).unixMillis,
        localTime('2500-01-01T00:00:00Z' as IsoDateTime).unixMillis,
        localTime('2500-01-01T00:00:00Z' as IsoDateTime).plusSeconds(1).unixMillis,
      ]
      const schema = j.number().unixTimestampMillis()

      testCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    it('should reject a non-integer value', () => {
      const invalidCases = [-0.5, 0.1, 1.5]
      const schema = j.number().unixTimestampMillis()

      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('unixTimestamp2000Millis', () => {
    it('should brand the value', () => {
      const schema = j.number().unixTimestamp2000Millis()

      const input = 0 as UnixTimestampMillis
      const [, result] = schema.getValidationResult(input)
      expectTypeOf(result).toEqualTypeOf<typeof input>()
    })

    it('should accept a number with a valid value', () => {
      const testCases: UnixTimestampMillis[] = [
        localTime('2000-01-01T00:00:00Z' as IsoDateTime).unixMillis,
        localTime('2500-01-01T00:00:00Z' as IsoDateTime).unixMillis,
      ]
      const schema = j.number().unixTimestamp2000Millis()

      testCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    it('should reject a number with an invalid value', () => {
      const invalidCases = [
        localTime('2000-01-01T00:00:00Z' as IsoDateTime).minusSeconds(1).unixMillis,
        localTime('2500-01-01T00:00:00Z' as IsoDateTime).plusSeconds(1).unixMillis,
        0.1,
      ]
      const schema = j.number().unixTimestamp2000Millis()

      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('utcOffset', () => {
    it('should accept a number with a valid value', () => {
      const testCases = [-12 * 60, 0, 14 * 60]
      const schema = j.number().utcOffset()

      testCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    it('should reject a number with an invalid value', () => {
      const invalidCases = [
        0.1, // non-integer
        14, // not a multiple of 15
        -13 * 60, // out of lower bound
        15 * 60, // out of upper bound
      ]
      const schema = j.number().utcOffset()

      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('utcOffsetHour', () => {
    it('should accept a number with a valid value', () => {
      const testCases = [-12, 0, 14]
      const schema = j.number().utcOffsetHour()

      testCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    it('should reject a number with an invalid value', () => {
      const invalidCases = [
        0.1, // non-integer
        -13, // out of lower bound
        15, // out of upper bound
      ]
      const schema = j.number().utcOffsetHour()

      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('precision', () => {
    it('should convert a floating point number to the precision when it makes sense', () => {
      const schema = j.object<{ foo: number }>({ foo: j.number().precision(3) })

      const testCases: [number, number][] = [
        [0, 0],
        [0.1, 0.1],
        [0.12, 0.12],
        [0.123, 0.123],
        [0.1234, 0.123],
        [0.1235, 0.124],
      ]
      testCases.forEach(([value, expected]) => {
        const [err, result] = schema.getValidationResult({ foo: value })
        expect(err).toBeNull()
        expect(result).toEqual({ foo: expected })
      })
    })
  })
})

describe('boolean', () => {
  it('should accept a boolean and infer the boolean type', () => {
    const schema = j.boolean()

    const [err, result] = schema.getValidationResult(true)

    expect(err).toBeNull()
    expect(result).toBe(true)
    expectTypeOf(result).toEqualTypeOf<boolean>()
  })

  it('should accept a boolean with a valid value', () => {
    const testCases = [true, false]
    const schema = j.boolean()

    testCases.forEach(value => {
      const [err] = schema.getValidationResult(value)
      expect(err, String(value)).toBeNull()
    })
  })

  it('should reject a boolean with an invalid value', () => {
    const invalidCases: any[] = ['a', 0, {}, []]
    const schema = j.boolean()

    invalidCases.forEach(value => {
      const [err] = schema.getValidationResult(value)
      expect(err, String(value)).not.toBeNull()
    })
  })

  describe('nullable', () => {
    it('should accept both booleans and null', () => {
      const schema = j.boolean().nullable()

      const [err1] = schema.getValidationResult(true)
      expect(err1).toBeNull()

      const [err2] = schema.getValidationResult(false)
      expect(err2).toBeNull()

      const [err3] = schema.getValidationResult(null)
      expect(err3).toBeNull()
    })

    it('should reject non-boolean, non-null values', () => {
      const schema = j.boolean().nullable()

      const invalidCases: any[] = ['a', 0, {}, []]
      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, _stringify(value)).not.toBeNull()
      })
    })
  })

  describe('optional(values)', () => {
    it('should convert specific values to `undefined`', () => {
      const schema = j.object<{ foo?: boolean }>({ foo: j.boolean().optional([false]) })

      const [err1, result1] = schema.getValidationResult({ foo: true })

      expect(err1).toBeNull()
      expect(result1).toEqual({ foo: true })

      const [err2, result2] = schema.getValidationResult({ foo: false })

      expect(err2).toBeNull()
      expect(result2).toEqual({})

      const [err3, result3] = schema.getValidationResult({})

      expect(err3).toBeNull()
      expect(result3).toEqual({})
    })
  })
})

describe('array', () => {
  it('should accept an array and infer its item type', () => {
    const schema = j.array(j.string().nullable())

    const [err, result] = schema.getValidationResult(['foo', null])

    expect(err).toBeNull()
    expect(result).toEqual(['foo', null])
    expectTypeOf(result).toEqualTypeOf<(string | null)[]>()
  })

  it('should accept valid data', () => {
    const testCases: any[] = [
      [j.string(), []],
      [j.string(), ['foo', 'bar']],
      [j.string().nullable(), ['foo', null]],
    ]

    testCases.forEach(([itemSchema, input]) => {
      const schema = j.array(itemSchema)

      const [err, result] = schema.getValidationResult(input)

      expect(err, String(input)).toBeNull()
      expect(result).toEqual(input)
    })
  })

  it('should reject invalid data', () => {
    const invalidTestCases: any[] = [
      // Invalid items
      [j.string(), ['foo', 1]],
      [j.string(), ['foo', undefined]],
      [j.string(), {}],
      // Invalid array
      [j.string(), 1],
      [j.string(), 'foo'],
      [j.string(), true],
      [j.string(), {}],
    ]

    invalidTestCases.forEach(([itemSchema, input]) => {
      const schema = j.array(itemSchema)

      const [err] = schema.getValidationResult(input)

      expect(err, String(input)).not.toBeNull()
    })
  })

  describe('minLength', () => {
    it('should accept valid data', () => {
      const testCases: any[] = [
        ['foo', 'bar'],
        ['foo', 'bar', 'shu'],
      ]
      const schema = j.array(j.string()).minLength(2)

      testCases.forEach(input => {
        const [err, result] = schema.getValidationResult(input)

        expect(err, String(input)).toBeNull()
        expect(result).toEqual(input)
      })
    })

    it('should reject invalid data', () => {
      const testCases: any[] = [[], ['foo'], 0, 'foo', {}, true]
      const schema = j.array(j.string()).minLength(2)

      testCases.forEach(input => {
        const [err] = schema.getValidationResult(input)

        expect(err, String(input)).not.toBeNull()
      })
    })
  })

  describe('maxLength', () => {
    it('should accept valid data', () => {
      const testCases: any[] = [[], ['foo'], ['foo', 'bar']]
      const schema = j.array(j.string()).maxLength(2)

      testCases.forEach(input => {
        const [err, result] = schema.getValidationResult(input)

        expect(err, String(input)).toBeNull()
        expect(result).toEqual(input)
      })
    })

    it('should reject invalid data', () => {
      const testCases: any[] = [['foo', 'bar', 'shu'], 0, 'foo', {}, true]
      const schema = j.array(j.string()).maxLength(2)

      testCases.forEach(input => {
        const [err] = schema.getValidationResult(input)

        expect(err, String(input)).not.toBeNull()
      })
    })
  })

  describe('length(min, max)', () => {
    it('should accept only arrays within the length range', () => {
      const schema = j.array(j.string()).length(1, 2)

      const validCases: any[] = [['foo'], ['foo', 'bar']]
      validCases.forEach(input => {
        const [err, result] = schema.getValidationResult(input)

        expect(err, String(input)).toBeNull()
        expect(result).toEqual(input)
      })

      const invalidCases: any[] = [[], ['foo', 'bar', 'shu']]
      invalidCases.forEach(input => {
        const [err] = schema.getValidationResult(input)

        expect(err, String(input)).not.toBeNull()
      })
    })
  })

  describe('length(eq)', () => {
    it('should accept only arrays of the given length', () => {
      const schema = j.array(j.string()).length(2)

      const validCases: any[] = [['foo', 'bar']]
      validCases.forEach(input => {
        const [err, result] = schema.getValidationResult(input)

        expect(err, String(input)).toBeNull()
        expect(result).toEqual(input)
      })

      const invalidCases: any[] = [[], ['foo'], ['foo', 'bar', 'shu']]
      invalidCases.forEach(input => {
        const [err] = schema.getValidationResult(input)

        expect(err, String(input)).not.toBeNull()
      })
    })
  })

  describe('exactLength', () => {
    it('should accept only arrays of the given length', () => {
      const schema = j.array(j.string()).exactLength(2)

      const validCases: any[] = [['foo', 'bar']]
      validCases.forEach(input => {
        const [err, result] = schema.getValidationResult(input)

        expect(err, String(input)).toBeNull()
        expect(result).toEqual(input)
      })

      const invalidCases: any[] = [[], ['foo'], ['foo', 'bar', 'shu']]
      invalidCases.forEach(input => {
        const [err] = schema.getValidationResult(input)

        expect(err, String(input)).not.toBeNull()
      })
    })
  })

  describe('unique', () => {
    it('should accept arrays with unique items', () => {
      const schema = j.array(j.number()).unique()

      const [err] = schema.getValidationResult([1, 2, 3])
      expect(err).toBeNull()
    })

    it('should reject arrays with duplicate items', () => {
      const schema = j.array(j.number()).unique()

      const [err] = schema.getValidationResult([1, 2, 2])
      expect(err).not.toBeNull()
    })
  })
})

describe('tuple', () => {
  it('should accept a tuple and infer the tuple type', () => {
    const schema = j.tuple([j.string().nullable(), j.number(), j.boolean()])

    const [err, result] = schema.getValidationResult(['foo', 1, true])

    expect(err).toBeNull()
    expect(result).toEqual(['foo', 1, true])
    expectTypeOf(result).toExtend<[string | null, number, boolean]>()
  })

  it('should accept matching tuples and reject mismatched ones', () => {
    const schema = j.tuple([j.string().minLength(3).nullable(), j.number(), j.boolean()])

    const testCases: any[] = [
      ['foo', 1, true],
      [null, 2, false],
    ]
    testCases.forEach(input => {
      const [err, result] = schema.getValidationResult(input)

      expect(err, String(input)).toBeNull()
      expect(result).toEqual(input)
    })

    const invalidCases: any[] = [[undefined, 1, true], ['fo', 1, true], 'foo', 0, true, {}, []]
    invalidCases.forEach(input => {
      const [err] = schema.getValidationResult(input)
      expect(err, String(input)).not.toBeNull()
    })
  })
})

describe('set', () => {
  it('should accept a Set2 and infer the Set2 type', () => {
    const schema = j.set(j.string())

    const [err, result] = schema.getValidationResult(new Set2(['foo', 'bar']))

    expect(err).toBeNull()
    expect(result).toBeInstanceOf(Set2)
    expect(result.toArray()).toEqual(['foo', 'bar'])
    expectTypeOf(result).toEqualTypeOf<Set2<string>>()
  })

  it('should accept valid data', () => {
    const testCases: any[] = [
      [j.string(), new Set2(['foo', 'bar'])],
      [j.string().nullable(), new Set2(['foo', null])],
      [j.array(j.string()), new Set2([['foo'], ['bar']])],
    ]

    testCases.forEach(([itemSchema, input]) => {
      const schema = j.set(itemSchema)

      const [err] = schema.getValidationResult(input)

      expect(err, String(input)).toBeNull()
    })
  })

  it('should reject invalid data', () => {
    const invalidTestCases: any[] = [
      // Invalid items
      [j.string(), new Set2(['foo', 1])],
      [j.string().nullable(), new Set2(['foo', undefined])],
      // Invalid Set2
      [j.string(), 1],
      [j.string(), 'foo'],
      [j.string(), true],
      [j.string(), {}],
      [j.string(), []],
    ]

    invalidTestCases.forEach(([itemSchema, input]) => {
      const schema = j.set(itemSchema)

      const [err] = schema.getValidationResult(input)

      expect(err, String(input)).not.toBeNull()
    })
  })

  it('should NOT accept an Array - when it is a standalone schema', () => {
    const schema = j.set(j.string())

    const [err] = schema.getValidationResult(['foo', 'bar'])

    expect(err).toMatchInlineSnapshot(`
      [AjvValidationError: Object can only transform an Iterable into a Set2 when the schema is in an object or an array schema. This is an Ajv limitation.
      Input: [ 'foo', 'bar' ]]
    `)
  })

  it('should accept an Array and produce a Set2 - when it is a property of an object', () => {
    const schema = j.object.infer({ set: j.set(j.string()) }).isOfType<{ set: Set2<string> }>()

    const [err, result] = schema.getValidationResult({ set: ['foo', 'bar'] })

    expect(err).toBeNull()
    expect(result.set).toBeInstanceOf(Set2)
    expect(result.set.toArray()).toEqual(['foo', 'bar'])
    expectTypeOf(result).toEqualTypeOf<{ set: Set2<string> }>()
  })

  it('should automagically make an Array unique', () => {
    const schema = j.object.infer({ set: j.set(j.string()) }).isOfType<{ set: Set2<string> }>()

    const [err, result] = schema.getValidationResult({
      set: ['foo', 'bar', 'foo'],
    })

    expect(err).toBeNull()
    expect(result.set.toArray()).toEqual(['foo', 'bar'])
  })

  describe('min', () => {
    it('should reject sets with fewer items', () => {
      const schema = j.object
        .infer({ set: j.set(j.string()).min(2) })
        .isOfType<{ set: Set2<string> }>()

      const [err1] = schema.getValidationResult({ set: ['a', 'b'] })
      expect(err1).toBeNull()

      const [err2] = schema.getValidationResult({ set: ['a'] })
      expect(err2).not.toBeNull()
    })
  })

  describe('max', () => {
    it('should reject sets with more items', () => {
      const schema = j.object
        .infer({ set: j.set(j.string()).max(2) })
        .isOfType<{ set: Set2<string> }>()

      const [err1] = schema.getValidationResult({ set: ['a', 'b'] })
      expect(err1).toBeNull()

      const [err2] = schema.getValidationResult({ set: ['a', 'b', 'c'] })
      expect(err2).not.toBeNull()
    })
  })
})

describe('object', () => {
  it('should accept a nested object and infer the passed-in type', () => {
    const schema = j.object<TestEverythingObject>({
      string: j.string(),
      stringOptional: j.string().optional(),
      array: j.array(j.string().nullable()),
      arrayOptional: j.array(j.string()).optional(),
      nested: j.object.infer({
        string: j.string(),
        stringOptional: j.string().optional(),
        array: j.array(j.string().nullable()),
        arrayOptional: j.array(j.string()).optional(),
      }),
    })

    const [err, result] = schema.getValidationResult({
      string: 'string',
      stringOptional: 'stringOptional',
      array: ['array', null],
      arrayOptional: ['array'],
      nested: {
        string: 'string',
        stringOptional: 'stringOptional',
        array: ['array', null],
        arrayOptional: ['array'],
      },
    })

    expect(err).toBeNull()
    expect(result).toEqual({
      string: 'string',
      stringOptional: 'stringOptional',
      array: ['array', null],
      arrayOptional: ['array'],
      nested: {
        string: 'string',
        stringOptional: 'stringOptional',
        array: ['array', null],
        arrayOptional: ['array'],
      },
    })
    expectTypeOf(result).toEqualTypeOf<{
      string: string
      stringOptional?: string
      array: (string | null)[]
      arrayOptional?: string[]
      nested: {
        string: string
        stringOptional?: string
        array: (string | null)[]
        arrayOptional?: string[]
      }
    }>()
  })

  it('should infer the passed-in type for the result', () => {
    interface Foo {
      string: string
      stringOptional?: string
    }

    const schema = j.object<Foo>({
      string: j.string(),
      stringOptional: j.string().optional(),
    })

    const [, result] = schema.getValidationResult({})

    expectTypeOf(result).toEqualTypeOf<Foo>()
  })

  it('should produce a type error when a required property is missing from the schema', () => {
    interface Foo {
      foo: string
      bar?: string
      missing: boolean
    }

    // @ts-expect-error That's the purpose of the test, that's why we have the expect error.
    j.object<Foo>({ foo: j.string(), bar: j.string().optional() })
  })

  interface TestEverythingObject {
    string: string
    stringOptional?: string
    array: (string | null)[]
    arrayOptional?: string[]
    nested: {
      string: string
      stringOptional?: string
      array: (string | null)[]
      arrayOptional?: string[]
    }
  }

  describe('extend', () => {
    it('should infer the extended type', () => {
      interface Foo {
        foo: string | null
        bar?: number
      }
      const schema1 = j.object<{ foo: string | null }>({ foo: j.string().nullable() })
      const schema2 = schema1.extend({ bar: j.number().optional() }).isOfType<Foo>()

      const [, result] = schema2.getValidationResult({
        foo: 'asdf',
        bar: 0,
      })

      expectTypeOf(result).toExtend<Foo>()
    })

    it('should throw on AjvSchema.create without an isOfType check', () => {
      const schema1 = j.object<{ foo: string | null }>({ foo: j.string().nullable() })
      const schema2 = schema1.extend({ bar: j.number().optional() })

      const fn = () => AjvSchema.create(schema2)
      expect(fn).toThrow(
        'The schema must be type checked against a type or interface, using the `.isOfType()` helper in `j`.',
      )
    })

    it('should accept only objects with both the base and the extended properties', () => {
      interface Foo {
        foo: string | null
        bar: number
      }
      const schema1 = j.object<{ foo: string | null }>({ foo: j.string().nullable() })
      const schema2 = schema1.extend({ bar: j.number() }).isOfType<Foo>()

      const testCases = [{ foo: 'foo', bar: 1 }]
      testCases.forEach(value => {
        const [err] = schema2.getValidationResult(value)
        expect(err, _stringify(value)).toBeNull()
      })

      const invalidCases: any[] = [
        { foo: 'foo' },
        { bar: 1 },
        {},
        0,
        'abcd',
        true,
        [],
        { abc: 'abc', def: 'def' },
      ]
      invalidCases.forEach(value => {
        const [err] = schema2.getValidationResult(value)
        expect(err, _stringify(value)).not.toBeNull()
      })
    })

    it('should narrow an overridden property in type and validation', () => {
      interface Base {
        foo: string | null
        bar: AnyObject
      }
      const schema1 = j.object<Base>({
        foo: j.string().nullable(),
        bar: j.object.any(),
      })

      interface Extended extends Base {
        bar: {
          shu: number
        }
        ping?: string
      }
      const schema2 = schema1
        .extend({
          bar: j.object<{ shu: number }>({ shu: j.number() }),
          ping: j.string().optional(),
        })
        .isOfType<Extended>()

      const [, result] = schema2.getValidationResult({
        foo: 'asdf',
        bar: { shu: 0 },
        ping: 'pong',
      })

      expectTypeOf(result).toExtend<Extended>()
      expectTypeOf(result).not.toEqualTypeOf<Base>()

      const testCases = [
        { foo: 'foo', bar: { shu: 1 }, ping: 'pong' },
        { foo: 'foo', bar: { shu: 1 } },
      ]
      testCases.forEach(value => {
        const [err] = schema2.getValidationResult(value)
        expect(err, _stringify(value)).toBeNull()
      })

      const invalidCases: any[] = [
        { foo: 'foo', bar: { boo: 'bah' } },
        { foo: 'foo', bar: {} },
        { foo: 'foo', bar: 0 },
        { foo: 'foo' },
        { bar: 1 },
        {},
        0,
        'abcd',
        true,
        [],
        { abc: 'abc', def: 'def' },
      ]
      invalidCases.forEach(value => {
        const [err] = schema2.getValidationResult(value)
        expect(err, _stringify(value)).not.toBeNull()
      })
    })

    it('should keep the type when extending with no properties', () => {
      interface Foo {
        bar: string
      }

      const schema1 = j.object<Foo>({ bar: j.string() })
      const schema2 = schema1.extend({}).isOfType<Foo>()

      const [, result] = schema2.getValidationResult({
        bar: 'asdf',
      })

      expectTypeOf(result).toExtend<Foo>()
    })

    it('should infer the type when extending a dbEntity schema', () => {
      interface BM {
        id: string
        created: UnixTimestamp
        updated: UnixTimestamp
      }
      interface FooBM extends BM {
        foo: string
        bar: AnyObject
      }
      interface Bar extends FooBM {
        bar: {
          shu: number
        }
      }

      const schema1 = j.object.dbEntity<FooBM>({
        foo: j.string(),
        bar: j.object.any(),
      })
      const schema2 = schema1
        .extend({
          bar: j.object<Bar['bar']>({
            shu: j.number(),
          }),
        })
        .isOfType<Bar>()

      const [, result] = schema2.getValidationResult({
        foo: 'bar',
        bar: {
          shu: 1,
        },
      })

      expectTypeOf(result).toExtend<Bar>()
    })

    it('should not collapse to never when extending a many-property schema with an enum', () => {
      enum Color {
        RED = 1,
        BLUE = 2,
      }

      interface Base {
        a?: string
        b?: string
        c?: number
        d?: boolean
        e?: string
        f?: string
        g?: number
        h?: boolean
        i?: string
        k?: boolean
        l?: boolean
        m?: boolean
        n?: boolean
        o?: number
      }

      interface Extended extends Base {
        color: Color
      }

      const baseSchema = j.object<Base>({
        a: j.string().optional(),
        b: j.string().optional(),
        c: j.number().optional(),
        d: j.boolean().optional(),
        e: j.string().optional(),
        f: j.string().optional(),
        g: j.number().optional(),
        h: j.boolean().optional(),
        i: j.string().optional(),
        k: j.boolean().optional(),
        l: j.boolean().optional(),
        m: j.boolean().optional(),
        n: j.boolean().optional(),
        o: j.number().optional(),
      })

      const extendedSchema = baseSchema.extend({ color: j.enum(Color) }).isOfType<Extended>()

      expectTypeOf(extendedSchema).not.toBeNever()
    })
  })

  describe('concat', () => {
    it('should validate the merged object and infer its type', () => {
      interface Foo {
        foo: string
      }
      const fooSchema = j.object<Foo>({ foo: j.string() })

      interface Bar {
        bar: number
      }
      const barSchema = j.object<Bar>({ bar: j.number() })

      interface Shu {
        foo: string
        bar: number
      }
      const shuSchema = fooSchema.concat(barSchema).isOfType<Shu>()

      const [err, result] = shuSchema.getValidationResult({
        foo: 'asdf',
        bar: 0,
      })

      expect(err).toBeNull()
      expect(result).toEqual({
        foo: 'asdf',
        bar: 0,
      })
      expectTypeOf(result).toExtend<Foo>()
    })

    it('should throw without `isOfType` check', () => {
      interface Foo {
        foo: string
      }
      const fooSchema = j.object<Foo>({ foo: j.string() })

      interface Bar {
        bar: number
      }
      const barSchema = j.object<Bar>({ bar: j.number() })

      const shuSchema = fooSchema.concat(barSchema)

      const fn = () => AjvSchema.create(shuSchema)

      expect(fn).toThrow(
        'The schema must be type checked against a type or interface, using the `.isOfType()` helper in `j`.',
      )
    })
  })

  describe('allowAdditionalProperties', () => {
    it('should strip away unspecified properties during validation when not set', () => {
      const schema = j.object
        .infer({
          string: j.string(),
        })
        .isOfType<{ string: string }>()

      const [, result] = schema.getValidationResult({
        string: 'hello',
        foo: 'world',
      })

      expect(result).toEqual({ string: 'hello' })
    })

    it('should not strip away unspecified properties during validation when set', () => {
      const schema = j.object
        .infer({
          string: j.string(),
        })
        .allowAdditionalProperties()
        .isOfType<{ string: string }>()

      const [, result] = schema.getValidationResult({
        string: 'hello',
        foo: 'world',
      })

      expect(result).toEqual({
        string: 'hello',
        foo: 'world',
      })
    })
  })

  describe('.dbEntity', () => {
    it('should accept an entity and infer the passed-in type', () => {
      interface DB extends BaseDBEntity {
        foo: string
      }

      // @ts-expect-error That's the purpose of the test, that's why we have the expect error. wrong schema
      const _ = j.object.dbEntity<DB>({ foo: j.number() })

      const schema = j.object.dbEntity<DB>({ foo: j.string() })

      const [err, result] = schema.getValidationResult({
        id: 'asdf',
        created: MOCK_TS_2018_06_21,
        updated: MOCK_TS_2018_06_21,
        foo: 'hello',
      })

      expect(err).toBeNull()
      expect(result).toEqual({
        id: 'asdf',
        created: MOCK_TS_2018_06_21,
        updated: MOCK_TS_2018_06_21,
        foo: 'hello',
      })
      expectTypeOf(result).toEqualTypeOf<DB>()
    })

    it('should add the base DB fields when called on a j.object schema', () => {
      interface Foo {
        foo: string
      }
      interface FooDB extends BaseDBEntity {
        foo: string
      }

      const baseSchema = j.object<Foo>({ foo: j.string() })
      const dbSchema = baseSchema.dbEntity().isOfType<FooDB>()

      const [err, result] = dbSchema.getValidationResult({
        id: 'id1',
        created: MOCK_TS_2018_06_21,
        updated: MOCK_TS_2018_06_21,
        foo: 'hello',
      })

      expect(err).toBeNull()
      expect(result).toEqual({
        id: 'id1',
        created: MOCK_TS_2018_06_21,
        updated: MOCK_TS_2018_06_21,
        foo: 'hello',
      })
      expectTypeOf(result).toExtend<FooDB>()
    })
  })

  describe('.infer', () => {
    it('should accept a nested object and infer its type', () => {
      const schema = j.object
        .infer({
          string: j.string(),
          stringOptional: j.string().optional(),
          array: j.array(j.string().nullable()),
          arrayOptional: j.array(j.string()).optional(),
          nested: j.object.infer({
            string: j.string(),
            stringOptional: j.string().optional(),
            array: j.array(j.string().nullable()),
            arrayOptional: j.array(j.string()).optional(),
          }),
        })
        .isOfType<TestEverythingObject>()

      const [err, result] = schema.getValidationResult({
        string: 'string',
        stringOptional: 'stringOptional',
        array: ['array', null],
        arrayOptional: ['array'],
        nested: {
          string: 'string',
          stringOptional: 'stringOptional',
          array: ['array', null],
          arrayOptional: ['array'],
        },
      })

      expect(err).toBeNull()
      expect(result).toEqual({
        string: 'string',
        stringOptional: 'stringOptional',
        array: ['array', null],
        arrayOptional: ['array'],
        nested: {
          string: 'string',
          stringOptional: 'stringOptional',
          array: ['array', null],
          arrayOptional: ['array'],
        },
      })
      expectTypeOf(result).toEqualTypeOf<{
        string: string
        stringOptional?: string
        array: (string | null)[]
        arrayOptional?: string[]
        nested: {
          string: string
          stringOptional?: string
          array: (string | null)[]
          arrayOptional?: string[]
        }
      }>()
    })

    it('should infer the isOfType type for the result', () => {
      interface Foo {
        string: string
        stringOptional?: string
      }

      const schema = j.object
        .infer({
          string: j.string(),
          stringOptional: j.string().optional(),
        })
        .isOfType<Foo>()

      const [, result] = schema.getValidationResult({})

      expectTypeOf(result).toEqualTypeOf<Foo>()
    })

    it('should reject when required properties are missing', () => {
      const schema = j.object
        .infer({ foo: j.string(), bar: j.string().optional() })
        .isOfType<{ foo: string; bar?: string }>()

      const [err1] = schema.getValidationResult({ foo: 'foo', bar: 'bar' })
      expect(err1).toBeNull()

      const [err2] = schema.getValidationResult({ foo: 'foo' })
      expect(err2).toBeNull()

      const [err3] = schema.getValidationResult({ bar: 'bar' })
      expect(err3).toMatchInlineSnapshot(`
      [AjvValidationError: Object must have required property 'foo'
      Input: { bar: 'bar' }]
    `)
    })

    interface TestEverythingObject {
      string: string
      stringOptional?: string
      array: (string | null)[]
      arrayOptional?: string[]
      nested: {
        string: string
        stringOptional?: string
        array: (string | null)[]
        arrayOptional?: string[]
      }
    }

    describe('extend', () => {
      it('should infer the extended type', () => {
        interface Foo {
          foo: string | null
          bar?: number
        }
        const schema1 = j.object.infer({ foo: j.string().nullable() })
        const schema2 = schema1.extend({ bar: j.number().optional() }).isOfType<Foo>()

        const [, result] = schema2.getValidationResult({
          foo: 'asdf',
          bar: 0,
        })

        expectTypeOf(result).toEqualTypeOf<Foo>()
      })
    })

    describe('.dbEntity instance method', () => {
      it('should extend an inferred object schema with base DB fields', () => {
        interface FooDB extends BaseDBEntity {
          foo: string
        }

        const baseSchema = j.object.infer({ foo: j.string() })
        const dbSchema = baseSchema.dbEntity().isOfType<FooDB>()

        const [err, result] = dbSchema.getValidationResult({
          id: 'id1',
          created: MOCK_TS_2018_06_21,
          updated: MOCK_TS_2018_06_21,
          foo: 'hello',
        })

        expect(err).toBeNull()
        expect(result).toEqual({
          id: 'id1',
          created: MOCK_TS_2018_06_21,
          updated: MOCK_TS_2018_06_21,
          foo: 'hello',
        })
        expectTypeOf(result).toExtend<FooDB>()
      })
    })
  })

  describe('.any', () => {
    it('should accept any object and infer AnyObject', () => {
      const schema = j.object.any()

      const [err, result] = schema.getValidationResult({ foo: 'bar' })

      expect(err).toBeNull()
      expect(result).toEqual({ foo: 'bar' })
      expectTypeOf(result).toEqualTypeOf<AnyObject>()
    })
  })

  describe('optional(null)', () => {
    it('should convert `null` to `undefined` for j.object', () => {
      interface Inner {
        foo: string
      }
      interface Outer {
        inner?: Inner
      }
      const schema = j.object<Outer>({
        inner: j.object<Inner>({ foo: j.string() }).optional([null]),
      })

      const [err1, result1] = schema.getValidationResult({ inner: { foo: 'bar' } })
      expect(err1).toBeNull()
      expect(result1).toEqual({ inner: { foo: 'bar' } })

      const [err2, result2] = schema.getValidationResult({ inner: null })
      expect(err2).toBeNull()
      expect(result2).toEqual({ inner: undefined })

      const [err3, result3] = schema.getValidationResult({})
      expect(err3).toBeNull()
      expect(result3).toEqual({})
    })

    it('should convert `null` to `undefined` for j.object.infer', () => {
      interface Outer {
        inner?: { foo: string }
      }
      const schema = j.object<Outer>({
        inner: j.object.infer({ foo: j.string() }).optional([null]),
      })

      const [err1, result1] = schema.getValidationResult({ inner: { foo: 'bar' } })
      expect(err1).toBeNull()
      expect(result1).toEqual({ inner: { foo: 'bar' } })

      const [err2, result2] = schema.getValidationResult({ inner: null })
      expect(err2).toBeNull()
      expect(result2).toEqual({ inner: undefined })
    })

    it('should convert `null` to `undefined` for j.object.dbEntity', () => {
      interface Inner extends BaseDBEntity {
        foo: string
      }
      interface Outer {
        inner?: Inner
      }
      const schema = j.object<Outer>({
        inner: j.object.dbEntity<Inner>({ foo: j.string() }).optional([null]),
      })

      const [err1, result1] = schema.getValidationResult({
        inner: { id: 'id', created: MOCK_TS_2018_06_21, updated: MOCK_TS_2018_06_21, foo: 'bar' },
      })
      expect(err1).toBeNull()
      expect(result1).toEqual({
        inner: { id: 'id', created: MOCK_TS_2018_06_21, updated: MOCK_TS_2018_06_21, foo: 'bar' },
      })

      const [err2, result2] = schema.getValidationResult({ inner: null })
      expect(err2).toBeNull()
      expect(result2).toEqual({ inner: undefined })
    })

    it('should not allow chaining after `optional(null)` (compile-time error)', () => {
      const schema = j.object<{ foo: string }>({ foo: j.string() }).optional([null])
      // When `null` is passed to optional(), the return type is JsonSchemaTerminal,
      // which doesn't have object-specific methods like extend().
      // This prevents mistakes at compile time rather than failing at runtime.
      // @ts-expect-error That's the purpose of the test, that's why we have the expect error. - extend doesn't exist on JsonSchemaTerminal
      expect(() => schema.extend({})).toThrow(TypeError)
    })

    it('should throw when used on a standalone schema (and not in an object/array)', () => {
      const schema = j.object<{ foo: string }>({ foo: j.string() }).optional([null])
      const ajvSchema = AjvSchema.create(schema)

      // The check only triggers when the value is `null` (not when it's a valid object)
      expect(() => ajvSchema.isValid(null)).toThrowErrorMatchingInlineSnapshot(
        `[AssertionError: You should only use \`optional([x, y, z])\` on a property of an object, or on an element of an array due to Ajv mutation issues.]`,
      )
    })

    it('should still be an optional field when passing in `null`', () => {
      interface Outer {
        inner?: { foo: string }
      }
      const schema = j.object<Outer>({
        inner: j.object<{ foo: string }>({ foo: j.string() }).optional([null]),
      })

      const [err1, result1] = schema.getValidationResult({})
      expect(err1).toBeNull()
      expect(result1).toEqual({})
    })
  })

  describe('minProperties', () => {
    it('should accept only objects with at least the minimum number of properties', () => {
      const schema = j
        .object<{ foo?: string; bar?: string; shu?: string }>({
          foo: j.string().optional(),
          bar: j.string().optional(),
          shu: j.string().optional(),
        })
        .minProperties(2)

      const testCases = [
        { foo: 'foo', bar: 'bar', shu: 'shu' },
        { foo: 'foo', bar: 'bar' },
      ]
      testCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, _stringify(value)).toBeNull()
      })

      const invalidCases: any[] = [
        { foo: 'foo' },
        {},
        0,
        'abcd',
        true,
        [],
        { abc: 'abc', def: 'def' },
      ]
      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, _stringify(value)).not.toBeNull()
      })
    })
  })

  describe('maxProperties', () => {
    it('should accept only objects with at most the maximum number of properties', () => {
      const schema = j
        .object<{ foo?: string; bar?: string; shu?: string }>({
          foo: j.string().optional(),
          bar: j.string().optional(),
          shu: j.string().optional(),
        })
        .maxProperties(2)

      const testCases = [{ foo: 'foo' }, {}, { foo: 'foo', bar: 'bar' }]
      testCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, _stringify(value)).toBeNull()
      })

      const invalidCases: any[] = [{ foo: 'foo', bar: 'bar', shu: 'shu' }, 0, 'abcd', true, []]
      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, _stringify(value)).not.toBeNull()
      })
    })
  })

  describe('.exclusiveProperties', () => {
    it('should accept at most one of the exclusive properties', () => {
      const schema = j
        .object<{ foo?: string; bar?: string; shu?: string }>({
          foo: j.string().optional(),
          bar: j.string().optional(),
          shu: j.string().optional(),
        })
        .exclusiveProperties(['foo', 'bar'])

      const testCases = [{}, { foo: 'foo' }, { bar: 'bar' }, { foo: 'foo', shu: 'shu' }]
      testCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, _stringify(value)).toBeNull()
      })

      const invalidCases: any[] = [{ foo: 'foo', bar: 'bar' }, 0, 'abcd', true, []]
      invalidCases.forEach(value => {
        const [err] = schema.getValidationResult(value)
        expect(err, _stringify(value)).not.toBeNull()
      })
    })
  })

  describe('.record', () => {
    it('should validate the values and strip keys that do not match the key schema', () => {
      type B = Branded<string, 'B'>
      const schema = j.object
        .record(
          j
            .string()
            .regex(/^\d{3,4}$/)
            .branded<B>(),
          j.number().nullable(),
        )
        .isOfType<Record<B, number | null>>()

      const validCases: any[] = [{}, { '123': 1, '2345': 2 }]
      for (const data of validCases) {
        const [err, result] = schema.getValidationResult(data)
        expect(err, _stringify(data)).toBeNull()
        expect(result, _stringify(data)).toEqual(data)
      }

      const invalidCases: any[] = [
        'a',
        1,
        true,
        [],
        { a: 'foo' }, // the value of every property must match the value schema
      ]
      for (const data of invalidCases) {
        const [err] = schema.getValidationResult(data)
        expect(err, _stringify(data)).not.toBeNull()
      }

      const specialCases: any[] = [
        { '123': 1, '2345': 2, '1': 3 }, // non matching keys are stripped
        { '123': 1, '2345': 2, a: 3 }, // non matching keys are stripped
      ]
      for (const data of specialCases) {
        const [err, result] = schema.getValidationResult(data)
        expect(result).toEqual({ '123': 1, '2345': 2 })
        expect(err, _stringify(data)).toBeNull()
      }
    })

    it('should allow undefined values when value schema is optional', () => {
      const schema = j.object
        .record(j.string(), j.number().optional())
        .isOfType<Partial<Record<string, number>>>()

      const validCases: any[] = [
        {},
        { a: 1 },
        { a: 1, b: 2 },
        { a: undefined, b: 1 }, // undefined values should be allowed
        { a: undefined }, // all undefined values should be allowed
      ]
      for (const data of validCases) {
        const [err, result] = schema.getValidationResult(data)
        expect(err, _stringify(data)).toBeNull()
        expect(result, _stringify(data)).toEqual(data)
      }
    })
  })

  describe('.withEnumKeys', () => {
    it('should validate a list of const keys and strip other keys', () => {
      const schema = j.object
        .withEnumKeys(['a', 'b', 1], j.number().optional())
        .isOfType<Partial<Record<'a' | 'b' | '1', number>>>()

      const validCases: any[] = [{}, { a: 1 }, { a: 1, b: 2 }, { a: 1, b: 2, '1': 3 }]
      for (const data of validCases) {
        const [err, result] = schema.getValidationResult(data)
        expect(err, _stringify(data)).toBeNull()
        expect(result, _stringify(data)).toEqual(data)
      }

      const invalidCases: any[] = ['a', 1, true, [], { a: '1' }]
      for (const data of invalidCases) {
        const [err] = schema.getValidationResult(data)
        expect(err, _stringify(data)).not.toBeNull()
      }

      const specialCases: any[] = [{ c: 3 }]
      for (const data of specialCases) {
        const [err, result] = schema.getValidationResult(data)
        expect(result).toEqual({}) // The key is thought of as an additional key which is stripped
        expect(err, _stringify(data)).toBeNull()
      }
    })

    it('should validate NumberEnum keys and strip other keys', () => {
      enum E {
        A = 1,
        B = 2,
      }
      const schema = j.object
        .withEnumKeys(E, j.number().optional())
        .isOfType<Partial<Record<`${E}`, number>>>()

      const validCases: any[] = [{}, { '1': 1 }, { '1': 1, '2': 2 }]
      for (const data of validCases) {
        const [err, result] = schema.getValidationResult(data)
        expect(err, _stringify(data)).toBeNull()
        expect(result, _stringify(data)).toEqual(data)
      }

      const invalidCases: any[] = ['a', 1, true, [], { '1': 'one' }]
      for (const data of invalidCases) {
        const [err] = schema.getValidationResult(data)
        expect(err, _stringify(data)).not.toBeNull()
      }

      const specialCases: any[] = [{ '3': 3 }]
      for (const data of specialCases) {
        const [err, result] = schema.getValidationResult(data)
        expect(result).toEqual({}) // The key is thought of as an additional key which is stripped
        expect(err, _stringify(data)).toBeNull()
      }
    })

    it('should validate StringEnum keys and strip other keys', () => {
      enum E {
        A = 'a',
        B = 'b',
      }

      const schema = j.object
        .withEnumKeys(E, j.number().optional())
        .isOfType<Partial<Record<E, number>>>()

      const validCases: any[] = [{}, { a: 1 }, { a: 1, b: 2 }, { a: 1, b: 2 }]
      for (const data of validCases) {
        const [err, result] = schema.getValidationResult(data)
        expect(err, _stringify(data)).toBeNull()
        expect(result, _stringify(data)).toEqual(data)
      }

      const invalidCases: any[] = ['a', 1, true, [], { a: '1' }]
      for (const data of invalidCases) {
        const [err] = schema.getValidationResult(data)
        expect(err, _stringify(data)).not.toBeNull()
      }

      const specialCases: any[] = [{ c: 3 }]
      for (const data of specialCases) {
        const [err, result] = schema.getValidationResult(data)
        expect(result).toEqual({}) // The key is thought of as an additional key which is stripped
        expect(err, _stringify(data)).toBeNull()
      }
    })

    it('should require all keys when the schema is non-optional', () => {
      enum E {
        A = 'a',
        B = 'b',
      }

      const schema = j.object.withEnumKeys(E, j.number()).isOfType<Record<E, number>>()

      const validCases = [{ a: 1, b: 2 }]
      for (const data of validCases) {
        const [err, result] = schema.getValidationResult(data)
        expect(err, _stringify(data)).toBeNull()
        expect(result, _stringify(data)).toEqual(data)
      }

      const invalidCases = [{}, { a: 1 }, { b: 2 }]
      for (const data of invalidCases) {
        const [err] = schema.getValidationResult(data)
        expect(err, _stringify(data)).not.toBeNull()
      }
    })

    it('should accept partial objects when the schema is optional', () => {
      enum E {
        A = 'a',
        B = 'b',
      }

      const schema = j.object
        .withEnumKeys(E, j.number().optional())
        .isOfType<Partial<Record<E, number>>>()

      const validCases = [{}, { a: 1 }, { b: 2 }, { a: 1, b: 2 }]
      for (const data of validCases) {
        const [err, result] = schema.getValidationResult(data)
        expect(err, _stringify(data)).toBeNull()
        expect(result, _stringify(data)).toEqual(data)
      }
    })

    it('should throw without `.isOfType` check', () => {
      const schema = j.object.withEnumKeys(['a', 'b', 1], j.number().optional())

      const fn = () => AjvSchema.create(schema)

      expect(fn).toThrow(
        'The schema must be type checked against a type or interface, using the `.isOfType()` helper in `j`.',
      )
    })

    describe('type narrowing', () => {
      it('should not match StringMap for NumberEnum', () => {
        enum E {
          A = 1,
          B = 2,
        }

        const schema = j.object.withEnumKeys(E, j.number().optional())

        // should NOT exactly match StringMap
        expectTypeOf(schema.isOfType<StringMap<number>>()).toBeNever()

        // should match the correct Partial<Record<`${E}`, ...>> type
        expectTypeOf(schema.isOfType<Partial<Record<`${E}`, number>>>()).not.toBeNever()
      })

      it('should not match StringMap for StringEnum', () => {
        enum E {
          A = 'a',
          B = 'b',
        }

        const schema = j.object.withEnumKeys(E, j.number().optional())

        // should NOT exactly match StringMap
        expectTypeOf(schema.isOfType<StringMap<number>>()).toBeNever()

        // should match the correct Partial<Record<E, ...>> type
        expectTypeOf(schema.isOfType<Partial<Record<E, number>>>()).not.toBeNever()
      })

      it('should not match Record<string, V>', () => {
        enum E {
          A = 'a',
          B = 'b',
        }

        const schema = j.object.withEnumKeys(E, j.number().optional())

        // should NOT exactly match Record<string, V>
        expectTypeOf(schema.isOfType<Partial<Record<string, number>>>()).toBeNever()

        // should match the correct Partial<Record<E, ...>> type
        expectTypeOf(schema.isOfType<Partial<Record<E, number>>>()).not.toBeNever()
      })

      it('should reject Record<number, V> for NumberEnum', () => {
        enum E {
          A = 1,
          B = 2,
        }

        const schema = j.object.withEnumKeys(E, j.number())

        // After the fix, keys are '1' | '2' (strings), not 1 | 2 (numbers)
        // So Record<number, number> should NOT match
        expectTypeOf(schema.isOfType<Record<number, number>>()).toBeNever()

        // But Record<`${E}`, number> should match
        expectTypeOf(schema.isOfType<Record<`${E}`, number>>()).not.toBeNever()
      })
    })

    describe('j.object compatibility', () => {
      it('should not collapse to never for a Partial<Record<E, V>> property', () => {
        enum E {
          A = 'a',
          B = 'b',
        }

        interface Foo {
          foo: Partial<Record<E, number>>
        }

        const schema = j.object<Foo>({
          foo: j.object.withEnumKeys(E, j.number().optional()),
        })

        expectTypeOf(schema).not.toEqualTypeOf<never>()
      })

      it('should infer a Record<E, V> property', () => {
        enum E {
          A = 'a',
          B = 'b',
        }

        interface Foo {
          foo: Record<E, number>
        }

        const schema = j.object<Foo>({
          foo: j.object.withEnumKeys(E, j.number()),
        })

        expectTypeOf(schema.out).toEqualTypeOf<Foo>()
      })
    })

    describe('minProperties', () => {
      it('should require the minimum number of properties for withEnumKeys', () => {
        enum E {
          A = 'a',
          B = 'b',
        }

        const schema = j.object
          .withEnumKeys(E, j.number().optional())
          .minProperties(1)
          .isOfType<Partial<Record<E, number>>>()

        const validCases: any[] = [{ a: 1 }, { a: 1, b: 2 }]
        for (const data of validCases) {
          const [err, result] = schema.getValidationResult(data)
          expect(err, _stringify(data)).toBeNull()
          expect(result, _stringify(data)).toEqual(data)
        }

        const invalidCases: any[] = [{}, { a: '1' }, { c: 1 }]
        for (const data of invalidCases) {
          const [err] = schema.getValidationResult(data)
          expect(err, _stringify(data)).not.toBeNull()
        }
      })
    })
  })

  describe('.stringMap', () => {
    it('should accept a string map of valid values and reject invalid ones', () => {
      const schema = j.object.stringMap(j.number().nullable()).isOfType<StringMap<number | null>>()

      const validCases: any[] = [{}, { a: 1 }, { a: 1, b: 2 }]
      for (const data of validCases) {
        const [err, result] = schema.getValidationResult(data)
        expect(err, _stringify(data)).toBeNull()
        expect(result, _stringify(data)).toEqual(data)
      }

      const invalidCases: any[] = ['a', 1, true, [], { a: '1' }, { a: 1, b: undefined }]
      for (const data of invalidCases) {
        const [err] = schema.getValidationResult(data)
        expect(err, _stringify(data)).not.toBeNull()
      }
    })

    it('should throw without `.isOfType` check', () => {
      const schema = j.object.stringMap(j.number())

      const fn = () => AjvSchema.create(schema)

      expect(fn).toThrow(
        'The schema must be type checked against a type or interface, using the `.isOfType()` helper in `j`.',
      )
    })

    it('should allow undefined values when value schema is optional', () => {
      const schema = j.object.stringMap(j.number().optional()).isOfType<StringMap<number>>()

      const validCases: any[] = [
        {},
        { a: 1 },
        { a: 1, b: 2 },
        { a: undefined, b: 1 }, // undefined values should be allowed
        { a: undefined }, // all undefined values should be allowed
      ]
      for (const data of validCases) {
        const [err, result] = schema.getValidationResult(data)
        expect(err, _stringify(data)).toBeNull()
        expect(result, _stringify(data)).toEqual(data)
      }
    })
  })

  describe('.withRegexKeys', () => {
    it('should accept keys matching the regex and strip non-matching keys', () => {
      const schema = j.object.withRegexKeys(/^\d{3,4}$/, j.number()).isOfType<StringMap<number>>()

      const [err, result] = schema.getValidationResult({ '123': 1, '1234': 2, abc: 3 })
      expect(err).toBeNull()
      expect(result).toEqual({ '123': 1, '1234': 2 })
    })

    it('should reject invalid value types', () => {
      const schema = j.object.withRegexKeys(/^\d{3,4}$/, j.number()).isOfType<StringMap<number>>()

      const [err] = schema.getValidationResult({ '123': 'not a number' })
      expect(err).not.toBeNull()
    })
  })

  it('should collapse to never when OUT has no keys but props are provided', () => {
    interface Foo {}

    const schema = j.object<Foo>({
      // @ts-expect-error - Foo has no properties, so passing { id } is a type error
      id: j.string(),
    })

    expectTypeOf(schema).toBeNever()
  })
})

describe('enum', () => {
  it('should accept a listed value and infer the union type', () => {
    const schema = j.enum([0, 'foo', false])

    const [err, result] = schema.getValidationResult(0)

    expect(err).toBeNull()
    expect(result).toBe(0)
    expectTypeOf(result).toEqualTypeOf<0 | 'foo' | false>()
  })

  it('should accept a valid value', () => {
    const testCases = [0, 'foo', false] as const
    const schema = j.enum([0, 'foo', false])

    testCases.forEach(value => {
      const [err] = schema.getValidationResult(value)
      expect(err, String(value)).toBeNull()
    })
  })

  it('should reject an invalid value', () => {
    const invalidCases: any[] = [1, 'abc', true, [], {}]
    const schema = j.enum([0, 'foo', false])

    invalidCases.forEach(value => {
      const [err] = schema.getValidationResult(value)
      expect(err, String(value)).not.toBeNull()
    })
  })

  it('should support typescript string enums', () => {
    enum OompaLoompa {
      Foo = 'foo',
      Bar = 'bar',
    }
    const schema = j.enum(OompaLoompa)
    const [err, result] = schema.getValidationResult(OompaLoompa.Bar)

    expect(err).toBeNull()
    expect(result).toBe(OompaLoompa.Bar)
    expectTypeOf(result).toEqualTypeOf<OompaLoompa>()
  })

  it('should support typescript numeric enums', () => {
    enum OompaLoompa {
      Foo = 0,
      Bar = 1,
    }
    const schema = j.enum(OompaLoompa)
    const [err, result] = schema.getValidationResult(OompaLoompa.Bar)

    expect(err).toBeNull()
    expect(result).toBe(OompaLoompa.Bar)
    expectTypeOf(result).toEqualTypeOf<OompaLoompa>()
  })

  it('should support _enum() objects', () => {
    const OompaLoompa = _enum({ Foo: 'foo', Bar: 'bar' })
    const schema = j.enum(OompaLoompa)
    const [err, result] = schema.getValidationResult(OompaLoompa.Bar)

    expect(err).toBeNull()
    expect(result).toBe('bar')
    expectTypeOf(result).toEqualTypeOf<'foo' | 'bar'>()

    // .values keeps working too, and yields the same type
    const [err2, result2] = j.enum(OompaLoompa.values).getValidationResult('foo')
    expect(err2).toBeNull()
    expect(result2).toBe('foo')
    expectTypeOf(result2).toEqualTypeOf<'foo' | 'bar'>()
  })

  it('should support numeric _enum() objects', () => {
    const OompaLoompa = _enum({ Foo: 0, Bar: 1 })
    const schema = j.enum(OompaLoompa)
    const [err, result] = schema.getValidationResult(OompaLoompa.Bar)

    expect(err).toBeNull()
    expect(result).toBe(1)
    expectTypeOf(result).toEqualTypeOf<0 | 1>()
  })

  it('should produce custom error message when msg option is provided', () => {
    const schema = j.enum(['foo', 'bar'], { msg: 'must be foo or bar' })

    const [err] = schema.getValidationResult('baz')
    expect(err).toMatchInlineSnapshot(`
      [AjvValidationError: Object must be foo or bar
      Input: baz]
    `)
  })
})

describe('buffer', () => {
  it('should accept a Buffer and infer the Buffer type', () => {
    const schema = j.buffer()

    const [err, result] = schema.getValidationResult(Buffer.from('asdf'))

    expect(err).toBeNull()
    expect(result).toBeInstanceOf(Buffer)
    expect(result).toEqual(Buffer.from('asdf'))
    expectTypeOf(result).toEqualTypeOf<Buffer>()
  })

  it('should accept valid data', () => {
    const testCases: any[] = ['foobar', [0, 1, 2]]

    const schema = j.buffer()

    testCases.forEach(input => {
      const [err] = schema.getValidationResult(Buffer.from(input))
      expect(err, String(input)).toBeNull()
    })
  })

  it('should reject invalid data', () => {
    const invalidTestCases: any[] = [
      // Invalid input for Buffer
      null,
      0,
      ['foo', 'bar'],
    ]
    const schema = j.buffer()

    invalidTestCases.forEach(input => {
      const [err] = schema.getValidationResult(input)
      expect(err, String(input)).not.toBeNull()
    })
  })

  it('should NOT accept an Array - when it is a standalone schema', () => {
    const schema = j.buffer()

    const [err] = schema.getValidationResult(['foo', 'bar'])

    expect(err).toMatchInlineSnapshot(`
      [AjvValidationError: Object can only transform data into a Buffer when the schema is in an object or an array schema. This is an Ajv limitation.
      Input: [ 'foo', 'bar' ]]
    `)
  })

  it('should accept an Array and produce a Buffer - when it is a property of an object', () => {
    const schema = j.object.infer({ buffer: j.buffer() }).isOfType<{ buffer: Buffer }>()

    const [err, result] = schema.getValidationResult({ buffer: 'foobar' })

    expect(err).toBeNull()
    expect(result.buffer).toBeInstanceOf(Buffer)
    expect(result.buffer).toEqual(Buffer.from('foobar'))
    expectTypeOf(result).toEqualTypeOf<{ buffer: Buffer }>()
  })
})

describe('oneOf', () => {
  it('should correctly infer the type', () => {
    const schema = j.oneOf([j.string().nullable(), j.number()])
    const [, result] = schema.getValidationResult({})
    expectTypeOf(result).toEqualTypeOf<string | number | null>()
  })

  it('should accept valid values', () => {
    const testCases = ['a', 1, null]
    const schema = j.oneOf([j.string().nullable(), j.number()])

    testCases.forEach(value => {
      const [err] = schema.getValidationResult(value)
      expect(err).toBeNull()
    })
  })

  it('should reject invalid values', () => {
    const invalidCases: any[] = [undefined, true, [], {}]
    const schema = j.oneOf([j.string().nullable(), j.number()])

    invalidCases.forEach(value => {
      const [err] = schema.getValidationResult(value)
      expect(err).not.toBeNull()
    })
  })

  it('should reject values matching multiple schemas', () => {
    // Both schemas accept strings of length 5-10
    const schema = j.oneOf([j.string().minLength(5), j.string().maxLength(10)])

    // 'hello' matches both schemas, so oneOf rejects it
    const [err] = schema.getValidationResult('hello')
    expect(err).not.toBeNull()
  })

  it('should throw when a branch holds an object schema', () => {
    const schema1 = j.object<{ data: { foo: string; bar: number } }>({
      data: j.object.infer({ foo: j.string(), bar: j.number() }),
    })
    const schema2 = j.object<{ data: { foo: string; shu: number } }>({
      data: j.object.infer({ foo: j.string(), shu: j.number() }),
    })

    expect(() => j.oneOf([schema1, schema2])).toThrowErrorMatchingInlineSnapshot(
      `[AssertionError: Do not use \`oneOf\` validation with non-primitive types!]`,
    )

    // Cannot hide an object inside an accepted schema
    expect(() =>
      j.oneOf([j.array(j.object<{ foo: string }>({ foo: j.string() }))]),
    ).toThrowErrorMatchingInlineSnapshot(
      `[AssertionError: Do not use \`oneOf\` validation with non-primitive types!]`,
    )

    // These should work
    j.oneOf([j.string().nullable()])
    j.oneOf([j.array(j.string())])
    j.oneOf([j.array(j.enum(['foo', 'bar']))])
    j.oneOf([j.array(j.enum(['valid', 'invalid'])), j.enum(['valid', 'invalid'])]).optional()
  })

  it('should propagate custom errorMessages from a branch', () => {
    const schema = j.oneOf([j.string().regex(/^[a-z]+$/, { msg: 'must be lowercase' }), j.number()])
    const [err] = schema.getValidationResult('ABC')
    expect(err).toMatchInlineSnapshot(`
      [AjvValidationError: Object must be lowercase
      Object must be number
      Object must match exactly one schema in oneOf
      Input: ABC]
    `)
  })
})

describe('anyOf', () => {
  it('should correctly infer the type', () => {
    const schema = j.anyOf([j.string().nullable(), j.number()])
    const [, result] = schema.getValidationResult({})
    expectTypeOf(result).toEqualTypeOf<string | number | null>()
  })

  it('should accept valid values', () => {
    const testCases = ['a', 1, null]
    const schema = j.anyOf([j.string().nullable(), j.number()])

    testCases.forEach(value => {
      const [err] = schema.getValidationResult(value)
      expect(err).toBeNull()
    })
  })

  it('should reject invalid values', () => {
    const invalidCases: any[] = [undefined, true, [], {}]
    const schema = j.anyOf([j.string().nullable(), j.number()])

    invalidCases.forEach(value => {
      const [err] = schema.getValidationResult(value)
      expect(err).not.toBeNull()
    })
  })

  it('should accept values matching multiple schemas', () => {
    // Both schemas accept strings of length 5-10
    const schema = j.anyOf([j.string().minLength(5), j.string().maxLength(10)])

    // 'hello' matches both schemas, anyOf accepts it (unlike oneOf)
    const [err] = schema.getValidationResult('hello')
    expect(err).toBeNull()
  })

  it('should throw when a branch holds an object schema', () => {
    const schema1 = j.object<{ data: { foo: string; bar: number } }>({
      data: j.object.infer({ foo: j.string(), bar: j.number() }),
    })
    const schema2 = j.object<{ data: { foo: string; shu: number } }>({
      data: j.object.infer({ foo: j.string(), shu: j.number() }),
    })

    expect(() => j.anyOf([schema1, schema2])).toThrowErrorMatchingInlineSnapshot(
      `[AssertionError: Do not use \`anyOf\` validation with non-primitive types!]`,
    )

    // Cannot hide an object inside an accepted schema
    expect(() =>
      j.anyOf([j.array(j.object<{ foo: string }>({ foo: j.string() }))]),
    ).toThrowErrorMatchingInlineSnapshot(
      `[AssertionError: Do not use \`anyOf\` validation with non-primitive types!]`,
    )

    // These should work
    j.anyOf([j.string().nullable()])
    j.anyOf([j.array(j.string())])
    j.anyOf([j.array(j.enum(['foo', 'bar']))])
    j.anyOf([j.array(j.enum(['valid', 'invalid'])), j.enum(['valid', 'invalid'])]).optional()
  })

  it('should propagate custom errorMessages from a branch', () => {
    const schema = j.anyOf([j.string().regex(/^[a-z]+$/, { msg: 'must be lowercase' }), j.number()])
    const [err] = schema.getValidationResult('ABC')
    expect(err).toMatchInlineSnapshot(`
      [AjvValidationError: Object must be lowercase
      Object must be number
      Object must match a schema in anyOf
      Input: ABC]
    `)
    expect(err!.data.errors.map(e => e.params)).toMatchInlineSnapshot(`
      [
        {},
        {
          "type": "number",
        },
        {},
      ]
    `)
  })

  it('should propagate custom errorMessages from a branch of a nested property', () => {
    const schema = j.object<{ token: string }>({
      token: j.anyOf([j.string().uuid(), j.string().email()]),
    })
    const [err] = schema.getValidationResult({ token: 'nope' })
    expect(err).toMatchInlineSnapshot(`
      [AjvValidationError: Object.token is an invalid UUID
      Got: nope
      Object.token is not a valid email address
      Got: nope
      Object.token must match a schema in anyOf
      Got: nope
      Input: { token: 'nope' }]
    `)
    expect(err!.data.errors.map(e => e.params)).toMatchInlineSnapshot(`
      [
        {},
        undefined,
        {},
      ]
    `)
  })
})

describe('nullable anyOf error messages', () => {
  it('should show clean error for nullable string with invalid input', () => {
    const schema = j.string().nullable()
    const [err] = schema.getValidationResult(123)
    expect(err).toMatchInlineSnapshot(`
      [AjvValidationError: Object must be string
      Input: 123]
    `)
  })

  it('should show clean error for nullable number with invalid input', () => {
    const schema = j.number().nullable()
    const [err] = schema.getValidationResult('abc')
    expect(err).toMatchInlineSnapshot(`
      [AjvValidationError: Object must be number
      Input: abc]
    `)
  })

  it('should show property errors for nullable object with invalid input', () => {
    const schema = j
      .object<{ name: string; age: number }>({
        name: j.string(),
        age: j.number(),
      })
      .nullable()
    const [err] = schema.getValidationResult({ name: 123, age: 'x' })
    expect(err).toMatchInlineSnapshot(`
      [AjvValidationError: Object.name must be string
      Got: 123
      Object.age must be number
      Got: x
      Input: { name: 123, age: 'x' }]
    `)
  })

  it('should propagate custom errorMessages through nullable', () => {
    const schema = j
      .string()
      .regex(/^[a-z]+$/, { msg: 'must be lowercase' })
      .nullable()
    const [err] = schema.getValidationResult('ABC')
    expect(err).toMatchInlineSnapshot(`
      [AjvValidationError: Object must be lowercase
      Input: ABC]
    `)
  })

  it('should accept null for nullable schemas', () => {
    const [err1] = j.string().nullable().getValidationResult(null)
    expect(err1).toBeNull()

    const [err2] = j.string().nullable().getValidationResult('valid')
    expect(err2).toBeNull()
  })

  it('should show clean error for nested nullable property', () => {
    interface NullableFoo {
      foo: string | null
    }
    const schema = j.object<NullableFoo>({ foo: j.string().nullable() })
    const [err] = schema.getValidationResult({ foo: 123 })
    expect(err).toMatchInlineSnapshot(`
      [AjvValidationError: Object.foo must be string
      Got: 123
      Input: { foo: 123 }]
    `)
  })

  it('should preserve all errors for non-nullable anyOf', () => {
    const schema = j.anyOf([j.string(), j.number()])
    const [err] = schema.getValidationResult(true)
    expect(err).toMatchInlineSnapshot(`
      [AjvValidationError: Object must be string
      Object must be number
      Object must match a schema in anyOf
      Input: true]
    `)
  })

  it('should show a clean type error for isoDate().optional([null])', () => {
    const schema = j.object<{ date?: IsoDate }>({ date: j.string().isoDate().optional([null]) })
    const [err] = schema.getValidationResult({ date: 123 })
    expect(err).toMatchInlineSnapshot(`
      [AjvValidationError: Object.date must be string
      Got: 123
      Input: { date: 123 }]
    `)
  })

  it('should show a clean IsoDate error for isoDate().optional([null])', () => {
    const schema = j.object<{ date?: IsoDate }>({ date: j.string().isoDate().optional([null]) })
    const [err] = schema.getValidationResult({ date: '2025-02-30' })
    expect(err).toMatchInlineSnapshot(`
      [AjvValidationError: Object.date is an invalid IsoDate
      Got: 2025-02-30
      Input: { date: '2025-02-30' }]
    `)
  })
})

describe('anyOfBy', () => {
  enum Foo {
    A = 1,
    B = 2,
    C = 3,
  }
  interface FooA {
    type: Foo.A
    foo: string
  }
  interface FooB {
    type: Foo.B
    bar: number
  }
  interface FooC {
    type: Foo.C
    foo: boolean
  }

  const schema = j.anyOfBy('type', {
    [Foo.A]: j.object<FooA>({ type: j.literal(Foo.A), foo: j.string() }),
    [Foo.B]: j.object<FooB>({ type: j.literal(Foo.B), bar: j.number() }),
    [Foo.C]: j.object<FooC>({
      type: j.literal(Foo.C),
      foo: j.boolean(),
    }),
  })

  it('should correctly infer the type', () => {
    const [, result] = schema.getValidationResult({ type: Foo.A, foo: 'asdf' })

    expectTypeOf(result).toEqualTypeOf<FooA | FooB | FooC>()
  })

  it('should accept values matching their discriminator branch and reject others', () => {
    const testCases = [
      { type: Foo.A, foo: 'asdf' },
      { type: Foo.B, bar: 1 },
      { type: Foo.C, foo: true },
    ]
    testCases.forEach(value => {
      const [err, result] = schema.getValidationResult(value)
      expect(result).toEqual(value)
      expect(err).toBeNull()
    })

    const invalidCases = [
      { type: Foo.C, foo: 'asdf' },
      { type: Foo.A, bar: 1 },
      { type: Foo.B, foo: true },
      { type: Foo.A },
      { type: Foo.B },
      { type: Foo.C },
      { foo: 'asdf' },
      { bar: 1 },
      { foo: true },
    ]
    invalidCases.forEach(value => {
      const [err] = schema.getValidationResult(value)
      expect(err).not.toBeNull()
    })
  })
})

describe('anyOfThese', () => {
  it('should correctly infer the type', () => {
    const schema = j.anyOfThese([j.string().nullable(), j.number()])
    const [, result] = schema.getValidationResult({})
    expectTypeOf(result).toEqualTypeOf<string | number | null>()
  })

  it('should accept values matching a branch and reject others', () => {
    const schema = j.anyOfThese([j.string().nullable(), j.number()])

    const testCases = ['a', 1, null]
    testCases.forEach(value => {
      const [err] = schema.getValidationResult(value)
      expect(err).toBeNull()
    })

    const invalidCases: any[] = [undefined, true, [], {}]
    invalidCases.forEach(value => {
      const [err] = schema.getValidationResult(value)
      expect(err).not.toBeNull()
    })
  })

  it('should accept values matching multiple schemas', () => {
    // Both schemas accept strings of length 5-10
    const schema = j.anyOfThese([j.string().minLength(5), j.string().maxLength(10)])

    // 'hello' matches both schemas, anyOfThese accepts it (unlike oneOf)
    const [err] = schema.getValidationResult('hello')
    expect(err).toBeNull()
  })

  it('should validate object branches and report when no branch fits', () => {
    const schema1 = j.object<{ data: { foo: string; bar: number } }>({
      data: j.object.infer({ foo: j.string(), bar: j.number() }),
    })
    const schema2 = j.object<{ data: { foo: string; shu: number } }>({
      data: j.object.infer({ foo: j.string(), shu: j.number() }),
    })
    const schema = j.anyOfThese([schema1, schema2])

    const testCases = [{ data: { foo: 'foo', bar: 1 } }, { data: { foo: 'foo', shu: 1 } }]
    testCases.forEach(value => {
      const [err] = schema.getValidationResult(value)
      expect(err).toBeNull()
    })

    const invalidCases: any[] = [undefined, true, [], {}, { data: { foo: 'foo' } }]
    invalidCases.forEach(value => {
      const [err] = schema.getValidationResult(value)
      expect(err).not.toBeNull()
    })

    const [err] = schema.getValidationResult({})
    expect(err).toMatchInlineSnapshot(`
      [AjvValidationError: Object could not find a suitable schema to validate against
      Input: {}]
    `)
  })

  it('should validate anyOfThese as a nested property', () => {
    const schema = j.object<{ data: { foo: string } | { bar: number } }>({
      data: j.anyOfThese([
        j.object.infer({ foo: j.string() }),
        j.object.infer({ bar: j.number() }),
      ]),
    })

    const testCases = [{ data: { foo: 'foo' } }, { data: { bar: 1 } }]
    testCases.forEach(value => {
      const [err] = schema.getValidationResult(value)
      expect(err).toBeNull()
    })

    const invalidCases: any[] = [undefined, true, [], {}, { data: { shu: 'foo' } }]
    invalidCases.forEach(value => {
      const [err] = schema.getValidationResult(value)
      expect(err).not.toBeNull()
    })
  })
})

describe('errors', () => {
  it('should display the path to the erroneous value', () => {
    const schema = j.object.infer({ foo: j.array(j.string()) }).isOfType<{ foo: string[] }>()

    const [err] = schema.getValidationResult({
      foo: ['a', 'b', 'c', 1, 'e'],
    })

    expect(err).toMatchInlineSnapshot(`
      [AjvValidationError: Object.foo[3] must be string
      Got: 1
      Input: { foo: [ 'a', 'b', 'c', 1, 'e' ] }]
    `)
  })
})

describe('castAs', () => {
  it('should correctly infer the new type', () => {
    const schema = j.object
      .infer({ foo: j.string() })
      .castAs<{ bar: number }>()
      .isOfType<{ bar: number }>()

    const [err, result] = schema.getValidationResult({ foo: 'hello' })

    expect(err).toBeNull()
    expect(result).toEqual({ foo: 'hello' })
    expectTypeOf(result).toEqualTypeOf<{ bar: number }>()
  })

  it('should cast the type of a JSchema (non-JBuilder) instance', () => {
    // .optional(['']) returns a JSchema, not a JBuilder
    const schema = j.string().optional(['']).castAs<string | undefined>()
    expectTypeOf(schema).toEqualTypeOf<JSchema<string | undefined, true>>()
  })
})

describe('default', () => {
  it('should use the default when the property is missing', () => {
    const schema = j.object<{ foo: string; bar: number; shu: boolean }>({
      foo: j.string().default('foo'),
      bar: j.number().default(123),
      shu: j.boolean().default(true),
    })

    const [err1, result1] = schema.getValidationResult({ foo: 'good', bar: 1, shu: false })
    expect(err1).toBeNull()
    expect(result1).toEqual({ foo: 'good', bar: 1, shu: false })

    const [err2, result2] = schema.getValidationResult({ bar: 1, shu: false })
    expect(err2).toBeNull()
    expect(result2).toEqual({ foo: 'foo', bar: 1, shu: false })

    const [err3, result3] = schema.getValidationResult({ foo: 'good', shu: false })
    expect(err3).toBeNull()
    expect(result3).toEqual({ foo: 'good', bar: 123, shu: false })

    const [err4, result4] = schema.getValidationResult({ foo: 'good', bar: 1 })
    expect(err4).toBeNull()
    expect(result4).toEqual({ foo: 'good', bar: 1, shu: true })
  })

  it('should throw on build() when .optional() and .default() are combined', () => {
    expect(() => j.string().optional().default('x').build()).toThrow(
      '.optional() and .default() should not be used together',
    )
  })
})

describe('final', () => {
  it('should keep the minLength and maxLength rules', () => {
    const schema = j.string().minLength(2).maxLength(3).final()

    const [err1] = schema.getValidationResult('abc')
    expect(err1).toBeNull()

    const [err2] = schema.getValidationResult('abcd')
    expect(err2!.message).toMatch(/^Object must NOT have more than 3 characters/)

    const [err3] = schema.getValidationResult('a')
    expect(err3!.message).toMatch(/^Object must NOT have fewer than 2 characters/)
  })
})

describe('literal', () => {
  it('should accept only the literal value and infer its type', () => {
    const schema1 = j.literal('magic')

    const [, result1] = schema1.getValidationResult('magic')
    expectTypeOf(result1).toEqualTypeOf<'magic'>()
    expect(result1).toBe('magic')

    const schema2 = j.literal(5)

    const [, result2] = schema2.getValidationResult(5)
    expectTypeOf(result2).toEqualTypeOf<5>()
    expect(result2).toBe(5)

    const schema3 = j.literal(true)

    const [, result3] = schema3.getValidationResult(true)
    expectTypeOf(result3).toEqualTypeOf<true>()
    expect(result3).toBe(true)

    const schema4 = j.literal(null)

    const [, result4] = schema4.getValidationResult(null)
    expectTypeOf(result4).toEqualTypeOf<null>()
    expect(result4).toBeNull()

    enum Foo {
      A = 1,
      B = 2,
    }
    const schema5 = j.literal(Foo.A)

    const [, result5] = schema5.getValidationResult(Foo.A)
    expectTypeOf(result5).toEqualTypeOf<Foo.A>()
    expect(result5).toBe(Foo.A)

    const [err1] = schema1.getValidationResult('mushroom')
    expect(err1).toMatchInlineSnapshot(`
      [AjvValidationError: Object must be equal to one of the allowed values
      Input: mushroom]
    `)

    const [err2] = schema2.getValidationResult(3)
    expect(err2).toMatchInlineSnapshot(`
      [AjvValidationError: Object must be equal to one of the allowed values
      Input: 3]
    `)

    const [err3] = schema3.getValidationResult(false)
    expect(err3).toMatchInlineSnapshot(`
      [AjvValidationError: Object must be equal to one of the allowed values
      Input: false]
    `)

    const [err4] = schema4.getValidationResult({})
    expect(err4).toMatchInlineSnapshot(`
      [AjvValidationError: Object must be equal to one of the allowed values
      Input: {}]
    `)
  })
})

describe('custom', () => {
  it('should run the custom validator and report its message', () => {
    const schema = j.number().custom(v => (Number.isInteger(v) ? undefined : 'not an integer!'))

    const [err1] = schema.getValidationResult(1)
    expect(err1).toBeNull()

    const [err2] = schema.getValidationResult(3.14)
    expect(err2).toMatchInlineSnapshot(`
      [AjvValidationError: Object not an integer!
      Input: 3.14]
    `)
  })

  it('should handle multiple validators', () => {
    const schema = j
      .number()
      .custom(v => (Number.isInteger(v) ? undefined : 'not an integer!'))
      .custom(v => (v === 3 ? undefined : 'Three shall be the number thou shalt count!'))

    const [err1] = schema.getValidationResult(3.14)
    expect(err1).toMatchInlineSnapshot(`
      [AjvValidationError: Object not an integer!
      Input: 3.14]
    `)

    const [err2] = schema.getValidationResult(2)
    expect(err2).toMatchInlineSnapshot(`
      [AjvValidationError: Object Three shall be the number thou shalt count!
      Input: 2]
    `)

    const [err3, result3] = schema.getValidationResult(3)
    expect(err3).toBeNull()
    expect(result3).toBe(3)
  })
})

describe('convert', () => {
  it('should convert a value in an object/array', () => {
    const schema1 = j.object<{ foo: number }>({ foo: j.number().convert(v => Math.round(v)) })

    const [err11, result11] = schema1.getValidationResult({ foo: 3.14 })
    expect(err11).toBeNull()
    expect(result11).toEqual({ foo: 3 })

    const schema2 = j.array(j.number().convert(v => Math.round(v)))

    const [err21, result21] = schema2.getValidationResult([3.14])
    expect(err21).toBeNull()
    expect(result21).toEqual([3])
  })

  it('should handle multiple converters', () => {
    const schema = j.object<{ foo: number }>({
      foo: j
        .number()
        .convert(v => Math.round(v))
        .convert(v => v ** 2),
    })

    const [err1, result1] = schema.getValidationResult({ foo: 3.14 })
    expect(err1).toBeNull()
    expect(result1).toEqual({ foo: 9 })
  })

  it('should throw when used on a standalone schema (and not in an object/array)', () => {
    const schema = j.number().convert(v => Math.round(v))
    const ajvSchema = AjvSchema.create(schema)

    expect(() => ajvSchema.isValid(3.14)).toThrowErrorMatchingInlineSnapshot(
      `[AssertionError: You should only use \`convert()\` on a property of an object, or on an element of an array due to Ajv mutation issues.]`,
    )
  })
})

describe('postValidation', () => {
  it('should call postValidation after successful validation', () => {
    const calls: unknown[] = []
    const schema = j
      .string()
      .minLength(1)
      .postValidation(v => {
        calls.push(v)
        return v
      })

    const [err, result] = schema.getValidationResult('hello')

    expect(err).toBeNull()
    expect(result).toBe('hello')
    expect(calls).toEqual(['hello'])
  })

  it('should not call postValidation when validation fails', () => {
    const calls: unknown[] = []
    const schema = j
      .string()
      .minLength(5)
      .postValidation(v => {
        calls.push(v)
        return v
      })

    const [err] = schema.getValidationResult('hi')

    expect(err).not.toBeNull()
    expect(calls).toEqual([])
  })

  it('should return validation error when postValidation throws', () => {
    const schema = j.string().postValidation(() => {
      throw new Error('custom post-validation error')
    })

    const [err] = schema.getValidationResult('hello')

    expect(err).not.toBeNull()
    expect(err!.message).toContain('custom post-validation error')
  })

  it('should make isValid reflect whether postValidation throws', () => {
    const schemaPass = j.string().postValidation(v => v)
    const schemaFail = j.string().postValidation(() => {
      throw new Error('nope')
    })

    expect(schemaPass.isValid('hello')).toBe(true)
    expect(schemaFail.isValid('hello')).toBe(false)
  })

  it('should throw from validate when postValidation throws', () => {
    const schema = j.string().postValidation(() => {
      throw new Error('post error')
    })

    expect(() => schema.validate('hello')).toThrow('post error')
  })

  it('should allow mutating the input in an object schema', () => {
    interface Foo {
      name: string
    }

    const schema = j.object<Foo>({ name: j.string() }).postValidation(v => {
      v.name = v.name.toUpperCase()
      return v
    })

    const [err, result] = schema.getValidationResult({ name: 'hello' })

    expect(err).toBeNull()
    expect(result).toEqual({ name: 'HELLO' })
  })

  it('should support type narrowing via OUT2', () => {
    interface Input {
      value: string
      computed?: number
    }

    interface Output {
      value: string
      computed: number
    }

    const schema = j
      .object<Input>({ value: j.string(), computed: j.number().optional() })
      .postValidation((v): Output => {
        v.computed = v.value.length
        return v as Output
      })

    const [err, result] = schema.getValidationResult({ value: 'hello' })

    expect(err).toBeNull()
    expectTypeOf(result).toEqualTypeOf<Output>()
    expect(result).toEqual({ value: 'hello', computed: 5 })
  })

  it('should preserve optional typing through postValidation', () => {
    const schema = j
      .number()
      .optional()
      .postValidation(v => v)

    expectTypeOf(schema.out).toEqualTypeOf<number | undefined>()
    expectTypeOf(schema.opt).toEqualTypeOf<true>()
  })

  it('should allow changing the type from optional to required via postValidation', () => {
    const schema = j
      .string()
      .optional()
      .postValidation<string>(v => v ?? 'default')

    expectTypeOf(schema.out).toEqualTypeOf<string>()
  })
})

describe('getValidationResult', () => {
  it('should validate and infer the type', () => {
    const schema = j.object<{ string: string; nested: { string: string } }>({
      string: j.string(),
      nested: j.object.infer({
        string: j.string(),
      }),
    })

    const [err, result] = schema.getValidationResult({
      string: 'string',
      nested: {
        string: 'string',
      },
    })

    expect(err).toBeNull()
    expect(result).toEqual({
      string: 'string',
      nested: {
        string: 'string',
      },
    })
    expectTypeOf(result).toEqualTypeOf<{
      string: string
      nested: {
        string: string
      }
    }>()
  })

  it('should cache the compiled AjvSchema after validation but not on a derived schema', () => {
    const schema = j.object<{ string: string; nested: { string: string } }>({
      string: j.string(),
      nested: j.object.infer({
        string: j.string(),
      }),
    })

    expect(schema[HIDDEN_AJV_SCHEMA]).toBeUndefined() // No pre-compiled AjvSchema by default

    schema.getValidationResult({
      string: 'string',
      nested: {
        string: 'string',
      },
    })

    expect(schema[HIDDEN_AJV_SCHEMA]).toBeInstanceOf(AjvSchema) // Pre-compiled AjvSchema after running a validation

    const schema1 = schema.optional()

    expect(schema1[HIDDEN_AJV_SCHEMA]).toBeUndefined() // No pre-compiled AjvSchema after changing the schema
  })
})

describe('getValidationFunction', () => {
  it('should validate and infer the type', () => {
    const schema = j.object<{ string: string; nested: { string: string } }>({
      string: j.string(),
      nested: j.object.infer({
        string: j.string(),
      }),
    })

    const validator = schema.getValidationFunction()

    const [err, result] = validator({
      string: 'string',
      nested: {
        string: 'string',
      },
    })

    expect(err).toBeNull()
    expect(result).toEqual({
      string: 'string',
      nested: {
        string: 'string',
      },
    })
    expectTypeOf(result).toEqualTypeOf<{
      string: string
      nested: {
        string: string
      }
    }>()
  })
})

describe('isValid', () => {
  it('should return true for a valid object', () => {
    const schema = j.object<{ string: string; nested: { string: string } }>({
      string: j.string(),
      nested: j.object.infer({
        string: j.string(),
      }),
    })

    const isValid = schema.isValid({
      string: 'string',
      nested: {
        string: 'string',
      },
    })

    expect(isValid).toBe(true)
  })
})

describe('validate', () => {
  it('should validate and infer the type', () => {
    const schema = j.object<{ string: string; nested: { string: string } }>({
      string: j.string(),
      nested: j.object.infer({
        string: j.string(),
      }),
    })

    const result = schema.validate({
      string: 'string',
      nested: {
        string: 'string',
      },
    })

    expect(result).toEqual({
      string: 'string',
      nested: {
        string: 'string',
      },
    })
    expectTypeOf(result).toEqualTypeOf<{
      string: string
      nested: {
        string: string
      }
    }>()
  })
})

describe('getOriginalInput option', () => {
  it('should use getOriginalInput for error messages instead of mutated input', () => {
    const schema = j.object<{ foo: string }>({ foo: j.string().minLength(5) })
    const ajvSchema = AjvSchema.create(schema)

    const input = { foo: 'hi', extra: 'stripped' }
    const originalInput = { ...input }

    const [err] = ajvSchema.getValidationResult(input, {
      getOriginalInput: () => originalInput,
    })

    expect(err).not.toBeNull()
    // The error message should contain 'extra' from the original input
    expect(err!.message).toContain('extra')
  })
})

describe('j.object.instanceOf()', () => {
  it('should validate Date instances', () => {
    const schema = j.object.instanceOf(Date)

    const [err, result] = schema.getValidationResult(new Date())

    expect(err).toBeNull()
    expect(result).toBeInstanceOf(Date)
    expectTypeOf(result).toEqualTypeOf<Date>()
  })

  it('should have correct type inference with optional', () => {
    const schema = j.object.instanceOf(Date).optional()

    const [err, result] = schema.getValidationResult(new Date())
    expect(err).toBeNull()
    expectTypeOf(result).toEqualTypeOf<Date | undefined>()
  })

  it('should have correct type inference with nullable', () => {
    const schema = j.object.instanceOf(Date).nullable()

    const [err, result] = schema.getValidationResult(new Date())
    expect(err).toBeNull()
    expectTypeOf(result).toEqualTypeOf<Date | null>()
  })

  it('should reject non-Date values', () => {
    const schema = j.object.instanceOf(Date)

    const invalidCases: any[] = [42, 'not a date', true, null, {}, []]
    invalidCases.forEach(value => {
      const [err] = schema.getValidationResult(value)
      expect(err, _stringify(value)).not.toBeNull()
    })
  })

  it('should accept a RegExp and reject a string', () => {
    const schema = j.object.instanceOf(RegExp)

    const [err, result] = schema.getValidationResult(/foo/)

    expect(err).toBeNull()
    expect(result).toBeInstanceOf(RegExp)
    expectTypeOf(result).toEqualTypeOf<RegExp>()

    const [err2] = schema.getValidationResult('not a regex')
    expect(err2).not.toBeNull()
  })

  it('should accept a custom class instance and reject a plain object', () => {
    class MyClass {
      constructor(public value: number) {}
    }

    const schema = j.object.instanceOf(MyClass)

    const instance = new MyClass(42)
    const [err, result] = schema.getValidationResult(instance)

    expect(err).toBeNull()
    expect(result).toBeInstanceOf(MyClass)
    expectTypeOf(result).toEqualTypeOf<MyClass>()

    const [err2] = schema.getValidationResult({ value: 42 })
    expect(err2).not.toBeNull()
  })

  it('should accept an instance of a subclass', () => {
    class Base {
      constructor(public id: number) {}
    }

    class Child extends Base {
      constructor(
        id: number,
        public name: string,
      ) {
        super(id)
      }
    }

    const schema = j.object.instanceOf(Base)

    const [err1] = schema.getValidationResult(new Base(1))
    expect(err1).toBeNull()

    const [err2] = schema.getValidationResult(new Child(1, 'test'))
    expect(err2).toBeNull()
  })

  it('should accept a Date property in an object schema', () => {
    interface WithDate {
      created: Date
      name: string
    }

    const schema = j
      .object<WithDate>({
        created: j.object.instanceOf(Date),
        name: j.string(),
      })
      .isOfType<WithDate>()

    const [err, result] = schema.getValidationResult({
      created: new Date(),
      name: 'test',
    })

    expect(err).toBeNull()
    expect(result.created).toBeInstanceOf(Date)
    expectTypeOf(result).toEqualTypeOf<WithDate>()
  })
})

describe('j.any().instanceof()', () => {
  it('should validate class instances', () => {
    const ajvSchema = AjvSchema.create({ type: 'object', instanceof: 'Date' })

    const [err1] = ajvSchema.getValidationResult(new Date())
    expect(err1).toBeNull()

    const [err2] = ajvSchema.getValidationResult('not a date')
    expect(err2).not.toBeNull()
  })

  it('should reject non-instances', () => {
    const ajvSchema = AjvSchema.create({ type: 'object', instanceof: 'Date' })

    const invalidCases: any[] = [42, true, null, {}, []]
    invalidCases.forEach(value => {
      const [err] = ajvSchema.getValidationResult(value)
      expect(err, _stringify(value)).not.toBeNull()
    })
  })
})

describe('type inference check', () => {
  type GarminUserId = Branded<'userId', string>

  it('should infer the passed-in type when the schema matches it', () => {
    interface GarminUserState {
      hasValidToken?: boolean
      lastSyncTimestamp?: UnixTimestamp | null
      lastUsedDeviceTypeName?: string
      userId: GarminUserId
      lastAuthDate: IsoDate
    }

    const garminUserStateSchema = j.object<GarminUserState>({
      hasValidToken: j.boolean().optional(),
      lastSyncTimestamp: j.number().unixTimestamp2000().nullable().optional(),
      lastUsedDeviceTypeName: j.string().optional(),
      userId: j.string().branded<GarminUserId>(),
      lastAuthDate: j.string().isoDate(),
    })

    expectTypeOf(garminUserStateSchema.out).toEqualTypeOf<GarminUserState>()
  })

  it('should collapse the schema to never when optionality is missing', () => {
    interface GarminUserState {
      hasValidToken?: boolean
      lastSyncTimestamp?: UnixTimestamp | null
      lastUsedDeviceTypeName?: string
      userId?: GarminUserId
      lastAuthDate?: IsoDate
    }

    const garminUserStateSchema = j.object<GarminUserState>({
      // @ts-expect-error missing .optional()
      hasValidToken: j.boolean(),
      // @ts-expect-error missing .optional()
      lastSyncTimestamp: j.number().unixTimestamp2000().nullable(),
      // @ts-expect-error missing .optional()
      lastUsedDeviceTypeName: j.string(),
      // @ts-expect-error missing .optional()
      userId: j.string().branded<GarminUserId>(),
      // @ts-expect-error missing .optional()
      lastAuthDate: j.string().isoDate(),
    })

    expectTypeOf(garminUserStateSchema).toEqualTypeOf<never>()
  })

  it('should collapse the schema to never when optionality is not needed', () => {
    interface GarminUserState {
      hasValidToken: boolean
      lastSyncTimestamp: UnixTimestamp | null
      lastUsedDeviceTypeName: string
      userId: GarminUserId
      lastAuthDate: IsoDate
    }

    const garminUserStateSchema = j.object<GarminUserState>({
      // @ts-expect-error unnecessary .optional()
      hasValidToken: j.boolean().optional(),
      // @ts-expect-error unnecessary .optional()
      lastSyncTimestamp: j.number().unixTimestamp2000().nullable().optional(),
      // @ts-expect-error unnecessary .optional()
      lastUsedDeviceTypeName: j.string().optional(),
      // @ts-expect-error unnecessary .optional()
      userId: j.string().branded<GarminUserId>().optional(),
      // @ts-expect-error unnecessary .optional()
      lastAuthDate: j.string().isoDate().optional(),
    })

    expectTypeOf(garminUserStateSchema).toEqualTypeOf<never>()
  })
})

it('should not collapse to never for an optional email in a nested inferred object', () => {
  interface ZendeskTriggerWebhookBody {
    assignee: {
      email?: string // empty = not set
    }
  }

  const zendeskWebhookBodySchema = j.object<ZendeskTriggerWebhookBody>({
    assignee: j.object.infer({
      email: j.string().email().optional(['']),
    }),
  })

  expectTypeOf(zendeskWebhookBodySchema).not.toEqualTypeOf<never>()
})

describe('type invariance', () => {
  // Verifying that JSchema is invariant in its OUT parameter,
  // which makes j.object<T>() strict about type matching.

  describe('record', () => {
    it('should reject numeric key schemas', () => {
      // JSON keys are always strings, so numeric key schemas can never work.
      // record() throws at runtime and returns never at the type level.
      expect(() => j.object.record(j.number(), j.string())).toThrow(
        'record() key schema must validate strings, not numbers',
      )
      expect(() => j.object.record(j.number().integer(), j.string())).toThrow(
        'record() key schema must validate strings, not numbers',
      )
    })

    it('should reject numeric enum key schemas', () => {
      // j.enum with numeric values produces a union of numeric literals
      const enumSchema = j.enum([1, 2, 3])

      // When used as record keys, the resulting type has numeric keys — but JSON keys are strings.
      // record() should reject this at runtime.
      expect(() => j.object.record(enumSchema, j.string())).toThrow(
        'record() key schema must validate strings, not numbers',
      )
    })

    it('should accept string-based key schemas', () => {
      const schema1 = j.object.record(j.string(), j.number())
      expectTypeOf(schema1).not.toBeNever()

      const schema2 = j.object.record(j.string().regex(/^\d+$/), j.number())
      expectTypeOf(schema2).not.toBeNever()
    })

    it('should not satisfy Record<E, V> in j.object', () => {
      enum E {
        A = 'a',
        B = 'b',
      }

      interface Foo {
        data: Record<E, number>
      }

      // JSchema is invariant: Record<string, number> !== Record<E, number>
      const schema = j.object<Foo>({
        // @ts-expect-error record(j.string(), ...) is too broad for Record<E, number>
        data: j.object.record(j.string(), j.number()),
      })

      expectTypeOf(schema).toBeNever()
    })
  })

  describe('stringMap', () => {
    it('should not satisfy Record<E, V> in j.object', () => {
      enum E {
        A = 'a',
        B = 'b',
      }

      interface Foo {
        data: Record<E, number>
      }

      // JSchema is invariant: StringMap<number> !== Record<E, number>
      const schema = j.object<Foo>({
        // @ts-expect-error stringMap is too broad for Record<E, number>
        data: j.object.stringMap(j.number()),
      })

      expectTypeOf(schema).toBeNever()
    })
  })

  describe('j.object<T>', () => {
    it('should reject optional schema for required property', () => {
      interface Foo {
        name: string // required
      }

      // JSchema is invariant: string | undefined !== string
      const schema = j.object<Foo>({
        // @ts-expect-error optional schema does not satisfy required property
        name: j.string().optional(),
      })

      expectTypeOf(schema).toBeNever()
    })

    it('should reject required schema for optional property', () => {
      interface Foo {
        name?: string // optional (string | undefined)
      }

      // JSchema is invariant: string !== string | undefined
      const schema = j.object<Foo>({
        // @ts-expect-error required schema does not satisfy optional property
        name: j.string(),
      })

      expectTypeOf(schema).toBeNever()
    })

    it('should reject wrong value type', () => {
      interface Foo {
        name: string
      }

      const schema = j.object<Foo>({
        // @ts-expect-error number is not assignable to string
        name: j.number(),
      })

      expectTypeOf(schema).toBeNever()
    })

    it('should reject nullable schema for non-nullable property', () => {
      interface Foo {
        name: string
      }

      const schema = j.object<Foo>({
        // @ts-expect-error string | null does not match string
        name: j.string().nullable(),
      })

      expectTypeOf(schema).toBeNever()
    })

    it('should accept nullable schema for nullable property', () => {
      interface Foo {
        name: string | null
      }

      const schema = j.object<Foo>({
        name: j.string().nullable(),
      })

      expectTypeOf(schema).not.toBeNever()
    })

    it('should reject non-nullable schema for nullable property', () => {
      interface Foo {
        name: string | null
      }

      const schema = j.object<Foo>({
        // @ts-expect-error string does not match string | null
        name: j.string(),
      })

      expectTypeOf(schema).toBeNever()
    })

    it('should reject anyOfThese union that widens the expected array element type', () => {
      interface Foo {
        id: string
        content: string
      }
      interface Bar {
        content: string
      }
      interface Input {
        field: Foo[]
      }

      const fooSchema = j.object<Foo>({
        id: j.string(),
        content: j.string(),
      })
      const barSchema = j.object<Bar>({
        content: j.string(),
      })
      const schema = j.object<Input>({
        // @ts-expect-error anyOfThese produces (Foo | Bar)[] which doesn't match Foo[]
        field: j.array(j.anyOfThese([fooSchema, barSchema])),
      })

      expectTypeOf(schema).toBeNever()
    })

    it('should reject anyOfBy union that widens the expected type', () => {
      interface Success {
        ok: true
        data: string
      }
      interface Failure {
        ok: false
        error: string
      }
      interface Input {
        result: Success
      }

      const successSchema = j.object<Success>({
        ok: j.boolean() as JSchema<true, false>,
        data: j.string(),
      })
      const failureSchema = j.object<Failure>({
        ok: j.boolean() as JSchema<false, false>,
        error: j.string(),
      })
      const schema = j.object<Input>({
        // @ts-expect-error anyOfBy produces Success | Failure which doesn't match Success
        result: j.anyOfBy('ok', { true: successSchema, false: failureSchema }),
      })

      expectTypeOf(schema).toBeNever()
    })
  })
})
