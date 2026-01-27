/* eslint-disable id-denylist */
/* oxlint-disable @typescript-eslint/explicit-function-return-type */

import { MOCK_TS_2018_06_21 } from '@naturalcycles/dev-lib/testing/time'
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
import { describe, expect, expectTypeOf, test } from 'vitest'
import { AjvSchema } from './ajvSchema.js'
import { j } from './jsonSchemaBuilder.js'

describe('immutability', () => {
  test('the rule chains should return new instances', () => {
    const schema1 = j.string()
    const schema2 = schema1.minLength(1)
    const schema3 = schema2.maxLength(2)

    expect(schema1).not.toBe(schema2)
    expect(schema2).not.toBe(schema3)
  })
})

describe('string', () => {
  test('should work correctly with type inference', () => {
    const schema = j.string()

    const [err, result] = AjvSchema.create(schema).getValidationResult('foo')

    expect(err).toBeNull()
    expect(result).toBe('foo')
    expectTypeOf(result).toEqualTypeOf<string>()
  })

  describe('optional(values)', () => {
    test('should convert specific values to `undefined`', () => {
      const schema = j.object<{ foo?: string }>({ foo: j.string().optional(['abcd']) })

      const [err1, result1] = AjvSchema.create(schema).getValidationResult({ foo: 'foo' })

      expect(err1).toBeNull()
      expect(result1).toEqual({ foo: 'foo' })

      const [err2, result2] = AjvSchema.create(schema).getValidationResult({ foo: 'abcd' })

      expect(err2).toBeNull()
      expect(result2).toEqual({})

      const [err3, result3] = AjvSchema.create(schema).getValidationResult({})

      expect(err3).toBeNull()
      expect(result3).toEqual({})

      const [err4, result4] = AjvSchema.create(schema).getValidationResult({ foo: undefined })

      expect(err4).toBeNull()
      expect(result4).toEqual({})
    })

    test('should work with `null` values', () => {
      const schema = j.object<{ foo?: string }>({ foo: j.string().optional([null]) })
      const ajvSchema = AjvSchema.create(schema)

      const [err1, result1] = ajvSchema.getValidationResult({ foo: 'foo' })
      expect(err1).toBeNull()
      expect(result1).toEqual({ foo: 'foo' })

      const [err2, result2] = ajvSchema.getValidationResult({ foo: null } as any)
      expect(err2).toBeNull()
      expect(result2).toEqual({ foo: undefined })
    })

    test('should not allow chaining after `optional([null])` (compile-time error)', () => {
      const schema = j.string().optional([null])
      // When `null` is included in optionalValues, the return type is JsonSchemaTerminal,
      // which doesn't have string-specific methods like minLength().
      // This prevents mistakes at compile time rather than failing at runtime.
      // @ts-expect-error - minLength doesn't exist on JsonSchemaTerminal
      expect(() => schema.minLength(1)).toThrow(TypeError)
    })

    test('should throw when used on a standalone schema (and not in an object/array)', () => {
      const schema = j.string().optional(['foo'])
      const ajvSchema = AjvSchema.create(schema)

      expect(() => ajvSchema.isValid('asdf')).toThrowErrorMatchingInlineSnapshot(
        `[AssertionError: You should only use \`optional([x, y, z]) on a property of an object, or on an element of an array due to Ajv mutation issues.]`,
      )
    })

    test('should still be an optional field when passing in `null`', () => {
      const schema = j.object<{ foo?: string }>({ foo: j.string().optional([null]) })
      const ajvSchema = AjvSchema.create(schema)

      const [err1, result1] = ajvSchema.getValidationResult({})
      expect(err1).toBeNull()
      expect(result1).toEqual({})
    })
  })

  describe('regex', () => {
    test('should correctly validate against the regex', () => {
      const schema = j.string().regex(/^[0-9]{2}$/)

      const [err01] = AjvSchema.create(schema).getValidationResult('00')
      expect(err01).toBeNull()
      const [err02] = AjvSchema.create(schema).getValidationResult('01')
      expect(err02).toBeNull()

      const [err11] = AjvSchema.create(schema).getValidationResult('000')
      expect(err11).not.toBeNull()
      const [err12] = AjvSchema.create(schema).getValidationResult('abc')
      expect(err12).not.toBeNull()
    })

    test('should allow setting custom error message', () => {
      const schema = j.string().regex(/^[0-9]{2}$/, { msg: 'is not a valid Oompa-loompa' })

      const [err11] = AjvSchema.create(schema).getValidationResult('000')
      expect(err11).toMatchInlineSnapshot(`
        [AjvValidationError: Object is not a valid Oompa-loompa
        Input: 000]
      `)
    })

    test('should allow setting custom validation name', () => {
      const schema = j.string().regex(/^[0-9]{2}$/, { name: 'Oompa-loompa' })

      const [err11] = AjvSchema.create(schema).getValidationResult('000')
      expect(err11).toMatchInlineSnapshot(`
        [AjvValidationError: Object is not a valid Oompa-loompa
        Input: 000]
      `)
    })

    test('should throw custom error from regex in item schema', () => {
      const itemSchema = j.string().regex(/^foo$/, { msg: 'must be "foo"' })
      const schema = j.array(itemSchema)
      const ajvSchema = AjvSchema.create(schema)

      const [err] = ajvSchema.getValidationResult(['foo', 'bar', 'baz'])

      expect(err).toMatchInlineSnapshot(`
        [AjvValidationError: Object[1] must be "foo"
        Object[2] must be "foo"
        Input: [ 'foo', 'bar', 'baz' ]]
      `)
    })

    test('should throw custom error from regex in property schema of object nested in item schema', () => {
      interface Item {
        name: string
      }

      const itemSchema = j.object<Item>({
        name: j.string().regex(/^foo$/, { msg: 'must be "foo"' }),
      })
      const schema = j.array(itemSchema)
      const ajvSchema = AjvSchema.create(schema)

      const [err] = ajvSchema.getValidationResult([{ name: 'foo' }, { name: 'bar' }])

      expect(err).toMatchInlineSnapshot(`
        [AjvValidationError: Object[1].name must be "foo"
        Input: [ { name: 'foo' }, { name: 'bar' } ]]
      `)
    })
  })

  describe('pattern', () => {
    test('should correctly validate against the pattern', () => {
      const schema = j.string().pattern('^[0-9]{2}$')

      const [err01] = AjvSchema.create(schema).getValidationResult('00')
      expect(err01).toBeNull()
      const [err02] = AjvSchema.create(schema).getValidationResult('01')
      expect(err02).toBeNull()

      const [err11] = AjvSchema.create(schema).getValidationResult('000')
      expect(err11).not.toBeNull()
      const [err12] = AjvSchema.create(schema).getValidationResult('abc')
      expect(err12).not.toBeNull()
    })

    test('should throw custom error from pattern in property schema', () => {
      interface Foo {
        foo: string
      }

      const schema = j.object<Foo>({
        foo: j.string().pattern('^abc$', { msg: 'must equal "abc"' }),
      })

      const [err] = AjvSchema.create(schema).getValidationResult({ foo: 'def' })

      expect(err).toMatchInlineSnapshot(`
        [AjvValidationError: Object.foo must equal "abc"
        Input: { foo: 'def' }]
      `)
    })

    test('should throw custom error from pattern in nested property schema', () => {
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

      const [err] = AjvSchema.create(schema).getValidationResult({ foo: { bar: 'def' } })

      expect(err).toMatchInlineSnapshot(`
        [AjvValidationError: Object.foo.bar must equal "abc"
        Input: { foo: { bar: 'def' } }]
      `)
    })

    test('should throw custom error from pattern in object with number keys', () => {
      interface Foo {
        1: string
      }

      const schema = j.object<Foo>({
        1: j.string().pattern('^abc$', { msg: 'must equal "abc"' }),
      })

      const [err] = AjvSchema.create(schema).getValidationResult({ 1: 'def' })

      expect(err).toMatchInlineSnapshot(`
        [AjvValidationError: Object[1] must equal "abc"
        Input: { '1': 'def' }]
      `)
    })
  })

  describe('minLength', () => {
    test('should correctly validate the minimum length of the string', () => {
      const schema = j.string().minLength(5)

      const [err01] = AjvSchema.create(schema).getValidationResult('01234')
      expect(err01).toBeNull()
      const [err02] = AjvSchema.create(schema).getValidationResult('012345')
      expect(err02).toBeNull()

      const [err11] = AjvSchema.create(schema).getValidationResult('0123')
      expect(err11).not.toBeNull()
    })
  })

  describe('maxLength', () => {
    test('should correctly validate the maximum length of the string', () => {
      const schema = j.string().maxLength(5)

      const [err01] = AjvSchema.create(schema).getValidationResult('0123')
      expect(err01).toBeNull()
      const [err02] = AjvSchema.create(schema).getValidationResult('01234')
      expect(err02).toBeNull()

      const [err11] = AjvSchema.create(schema).getValidationResult('012345')
      expect(err11).not.toBeNull()
    })
  })

  describe('length(min, max)', () => {
    test('should correctly validate the length of the string', () => {
      const schema = j.string().length(4, 5)

      const [err01] = AjvSchema.create(schema).getValidationResult('0123')
      expect(err01).toBeNull()
      const [err02] = AjvSchema.create(schema).getValidationResult('01234')
      expect(err02).toBeNull()

      const [err11] = AjvSchema.create(schema).getValidationResult('012')
      expect(err11).not.toBeNull()
      const [err12] = AjvSchema.create(schema).getValidationResult('012345')
      expect(err12).not.toBeNull()
    })
  })

  describe('length(eq)', () => {
    test('should correctly validate the length of the string', () => {
      const schema = j.string().length(4)

      const [err01] = AjvSchema.create(schema).getValidationResult('0123')
      expect(err01).toBeNull()

      const [err02] = AjvSchema.create(schema).getValidationResult('01234')
      expect(err02).not.toBeNull()
      const [err11] = AjvSchema.create(schema).getValidationResult('012')
      expect(err11).not.toBeNull()
      const [err12] = AjvSchema.create(schema).getValidationResult('012345')
      expect(err12).not.toBeNull()
    })
  })

  describe('trim', () => {
    test('should trim the input string - when inside an object schema', () => {
      const schema = j.object.infer({ trim: j.string().trim() }).isOfType<{ trim: string }>()

      const [err, result] = AjvSchema.create(schema).getValidationResult({
        trim: '  trimmed  string  ',
      })

      expect(err).toBeNull()
      expect(result.trim).toBe('trimmed  string')
    })

    test('should trim the input string - when inside an array schema', () => {
      const schema = j.array(j.string().trim())

      const [err, result] = AjvSchema.create(schema).getValidationResult(['  trimmed  string  '])

      expect(err).toBeNull()
      expect(result[0]).toBe('trimmed  string')
    })

    test('should silently fail when not inside a parent schema', () => {
      const schema = j.string().trim()

      const [err, result] = AjvSchema.create(schema).getValidationResult('  trimmed  string  ')

      expect(err).toBeNull()
      expect(result).toBe('  trimmed  string  ')
    })
  })

  describe('toLowerCase', () => {
    test('should toLowerCase the input string - when inside an object schema', () => {
      const schema = j.object
        .infer({ toLowerCase: j.string().toLowerCase() })
        .isOfType<{ toLowerCase: string }>()

      const [err, result] = AjvSchema.create(schema).getValidationResult({
        toLowerCase: 'lOwErCaSe StRiNg',
      })

      expect(err).toBeNull()
      expect(result.toLowerCase).toBe('lowercase string')
    })

    test('should toLowerCase the input string - when inside an array schema', () => {
      const schema = j.array(j.string().toLowerCase())

      const [err, result] = AjvSchema.create(schema).getValidationResult(['lOwErCaSe StRiNg'])

      expect(err).toBeNull()
      expect(result[0]).toBe('lowercase string')
    })

    test('should silently fail when not inside a parent schema', () => {
      const schema = j.string().toLowerCase()

      const [err, result] = AjvSchema.create(schema).getValidationResult('lOwErCaSe StRiNg')

      expect(err).toBeNull()
      expect(result).toBe('lOwErCaSe StRiNg')
    })
  })

  describe('toUpperCase', () => {
    test('should toUpperCase the input string - when inside an object schema', () => {
      const schema = j.object
        .infer({ toUpperCase: j.string().toUpperCase() })
        .isOfType<{ toUpperCase: string }>()

      const [err, result] = AjvSchema.create(schema).getValidationResult({
        toUpperCase: 'UpPeRcAsE StRiNg',
      })

      expect(err).toBeNull()
      expect(result.toUpperCase).toBe('UPPERCASE STRING')
    })

    test('should toUpperCase the input string - when inside an array schema', () => {
      const schema = j.array(j.string().toUpperCase())

      const [err, result] = AjvSchema.create(schema).getValidationResult(['UpPeRcAsE StRiNg'])

      expect(err).toBeNull()
      expect(result[0]).toBe('UPPERCASE STRING')
    })

    test('should silently fail when not inside a parent schema', () => {
      const schema = j.string().toUpperCase()

      const [err, result] = AjvSchema.create(schema).getValidationResult('UpPeRcAsE StRiNg')

      expect(err).toBeNull()
      expect(result).toBe('UpPeRcAsE StRiNg')
    })
  })

  describe('truncate', () => {
    test('should truncate the input string - when inside an object schema', () => {
      const schema = j.object
        .infer({ truncate: j.string().truncate(5) })
        .isOfType<{ truncate: string }>()

      const [err, result] = AjvSchema.create(schema).getValidationResult({
        truncate: '0123456',
      })

      expect(err).toBeNull()
      expect(result.truncate).toBe('01234')
    })

    test('should truncate the input string - when inside an array schema', () => {
      const schema = j.array(j.string().truncate(5))

      const [err, result] = AjvSchema.create(schema).getValidationResult(['0123456'])

      expect(err).toBeNull()
      expect(result[0]).toBe('01234')
    })

    test('should silently fail when not inside a parent schema', () => {
      const schema = j.string().truncate(5)

      const [err, result] = AjvSchema.create(schema).getValidationResult('0123456')

      expect(err).toBeNull()
      expect(result).toBe('0123456')
    })

    test('should trim the result when trim is part of the chain', () => {
      const schema = j.object
        .infer({ truncate: j.string().trim().truncate(5) })
        .isOfType<{ truncate: string }>()

      const [err, result] = AjvSchema.create(schema).getValidationResult({
        truncate: '  01234 56  ',
      })

      expect(err).toBeNull()
      expect(result.truncate).toBe('01234')
    })
  })

  describe('branded', () => {
    test('should work correctly with type inference', () => {
      type AccountId = Branded<string, 'AccountId'>
      const schema = j.string().branded<AccountId>()

      const [err, result] = AjvSchema.create(schema).getValidationResult('AccountId' as AccountId)

      expect(err).toBeNull()
      expect(result).toBe('AccountId')
      expectTypeOf(result).toEqualTypeOf<AccountId>()
    })
  })

  describe('email', () => {
    test('should accept valid email address - %s', () => {
      const testCases: string[] = [
        'david@nc.se',
        'paul-louis@nc.co.uk',
        'kamalaharris@gmail.com',
        'kamalaharris@gmail.com ', // trailing spaces should not cause an error, note: we can't mutate primitives
      ]
      const schema = j.string().email()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(email => {
        const [err, value] = ajvSchema.getValidationResult(email)
        expect(err, String(email)).toBeNull()
        expect(value, String(email)).toBe(email)
      })
    })

    test('should reject invalid email address', () => {
      const schema = j.string().email()
      const ajvSchema = AjvSchema.create(schema)

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
        const [err] = ajvSchema.getValidationResult(email)
        expect(err).not.toBeNull()
      })
    })

    test('should trim the email when it`s wrapped in an object or array', () => {
      const schema1 = j.object<{ email: string }>({ email: j.string().email() })
      const ajvSchema1 = AjvSchema.create(schema1)
      const [err1, value1] = ajvSchema1.getValidationResult({ email: 'kamalaharris@gmail.com ' }) // em space
      expect(err1).toBeNull()
      expect(value1).toEqual({ email: 'kamalaharris@gmail.com' })

      const schema2 = j.array(j.string().email())
      const ajvSchema2 = AjvSchema.create(schema2)
      const [err2, value2] = ajvSchema2.getValidationResult(['kamalaharris@gmail.com ']) // em space
      expect(err2).toBeNull()
      expect(value2).toEqual(['kamalaharris@gmail.com'])
    })

    test('should lowercase the email when it`s wrapped in an object or array', () => {
      const schema1 = j.object<{ email: string }>({ email: j.string().email() })
      const ajvSchema1 = AjvSchema.create(schema1)
      const [err1, value1] = ajvSchema1.getValidationResult({ email: 'KAMALAHARRIS@gmail.com' })
      expect(err1).toBeNull()
      expect(value1).toEqual({ email: 'kamalaharris@gmail.com' })

      const schema2 = j.array(j.string().email())
      const ajvSchema2 = AjvSchema.create(schema2)
      const [err2, value2] = ajvSchema2.getValidationResult(['KAMALAHARRIS@gmail.com'])
      expect(err2).toBeNull()
      expect(value2).toEqual(['kamalaharris@gmail.com'])
    })

    test('should produce a readable error message', () => {
      const schema = j.string().email()
      const ajvSchema = AjvSchema.create(schema)

      const [err1] = ajvSchema.getValidationResult('karius@tandtroll.con')
      expect(err1).toMatchInlineSnapshot(`
        [AjvValidationError: Object has an invalid TLD
        Input: karius@tandtroll.con]
      `)

      const [err2] = ajvSchema.getValidationResult('kamal>aharris@gmail.com')
      expect(err2).toMatchInlineSnapshot(`
        [AjvValidationError: Object is not a valid email address
        Input: kamal>aharris@gmail.com]
      `)
    })

    test('should convert the email to lowercase - when inside an object schema', () => {
      const schema = j.object.infer({ email: j.string().email() }).isOfType<{ email: string }>()

      const [, result] = AjvSchema.create(schema).getValidationResult({ email: 'LOWERCASE@nc.COM' })

      expect(result.email).toBe('lowercase@nc.com')
    })

    test('should trim the email - when inside an object schema', () => {
      const schema = j.object.infer({ email: j.string().email() }).isOfType<{ email: string }>()

      const [, result] = AjvSchema.create(schema).getValidationResult({
        email: '  trimmed@nc.com  ',
      })

      expect(result.email).toBe('trimmed@nc.com')
    })

    test('should work with optional(values)', () => {
      const schema = j.object<{ foo?: string }>({ foo: j.string().email().optional(['']) })
      const ajvSchema = AjvSchema.create(schema)

      const [err1, result1] = ajvSchema.getValidationResult({ foo: 'foo@boo.com' })
      expect(err1).toBeNull()
      expect(result1).toEqual({ foo: 'foo@boo.com' })

      const [err2, result2] = ajvSchema.getValidationResult({ foo: '' })
      expect(err2).toBeNull()
      expect(result2).toEqual({ foo: undefined })

      const [err3, result3] = ajvSchema.getValidationResult({})
      expect(err3).toBeNull()
      expect(result3).toEqual({})
    })
  })

  describe('the checkTLD option', () => {
    test('should validate the TLD part strictly by default', () => {
      const schema = j.string().email()

      const [err01] = AjvSchema.create(schema).getValidationResult('david@nc.se')
      expect(err01).toBeNull()
      const [err02] = AjvSchema.create(schema).getValidationResult('david@very.cool')
      expect(err02).toBeNull()

      const [err11] = AjvSchema.create(schema).getValidationResult('kirill@nc.gizmo')
      expect(err11).toMatchInlineSnapshot(`
        [AjvValidationError: Object has an invalid TLD
        Input: kirill@nc.gizmo]
      `)
    })

    test('should not validate the TLD part strictly when `checkTLD` is `false`', () => {
      const schema = j.string().email({ checkTLD: false })

      const [err01] = AjvSchema.create(schema).getValidationResult('david@nc.se')
      expect(err01).toBeNull()
      const [err02] = AjvSchema.create(schema).getValidationResult('david@very.cool')
      expect(err02).toBeNull()

      const [err11] = AjvSchema.create(schema).getValidationResult('kirill@nc.gizmo')
      expect(err11).toBeNull()
    })
  })

  describe('IsoDate', () => {
    test('should work correctly with type inference', () => {
      const schema = j.string().isoDate()

      const [err, result] = AjvSchema.create(schema).getValidationResult('2025-10-15')

      expect(err).toBeNull()
      expect(result).toBe('2025-10-15')
      expectTypeOf(result).toEqualTypeOf<IsoDate>()
    })

    test('should reject with proper error message', () => {
      const schema = j.string().isoDate()

      const [err] = AjvSchema.create(schema).getValidationResult(
        'Second day of the second month of the year of the snake',
      )

      expect(err).toMatchInlineSnapshot(`
        [AjvValidationError: Object is an invalid IsoDate
        Input: Second day of the second month of the year of the snake]
      `)
    })

    test('should accept valid data', () => {
      const testCases = ['2001-01-01', '1984-02-29', '2026-08-08', '2000-02-29']
      const d = localDate.fromString('2001-01-01' as IsoDate)
      for (let i = 1; i < 366; ++i) {
        testCases.push(d.plusDays(i).toISODate())
      }
      const schema = j.string().isoDate()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(date => {
        const [err] = ajvSchema.getValidationResult(date)
        expect(err, String(date)).toBeNull()
      })
    })

    test('should reject invalid data', () => {
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
        0,
        false,
        {},
        [],
      ]
      const schema = j.string().isoDate()
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(date => {
        const [err] = ajvSchema.getValidationResult(date)
        expect(err, String(date)).not.toBeNull()
      })
    })

    describe('before', () => {
      test('should accept valid data', () => {
        const testCases: any[] = ['2018-06-20']
        const schema = j.string().isoDate().before('2018-06-21')
        const ajvSchema = AjvSchema.create(schema)

        testCases.forEach(date => {
          const [err] = ajvSchema.getValidationResult(date)
          expect(err, String(date)).toBeNull()
        })

        const invalidCases: any[] = ['2018-06-21', '2018-06-22']

        invalidCases.forEach(date => {
          const [err] = ajvSchema.getValidationResult(date)
          expect(err, String(date)).not.toBeNull()
        })
      })

      test('should reject invalid date for the rule', () => {
        const schema = j.string().isoDate().before('abcd')
        const [err] = AjvSchema.create(schema).getValidationResult('2018-06-21')
        expect(err).toMatchInlineSnapshot(`
          [AjvValidationError: Object is not before abcd
          Input: 2018-06-21]
        `)
      })
    })

    describe('sameOrBefore', () => {
      test('should accept valid data', () => {
        const testCases: any[] = ['2018-06-20', '2018-06-21']
        const schema = j.string().isoDate().sameOrBefore('2018-06-21')
        const ajvSchema = AjvSchema.create(schema)

        testCases.forEach(date => {
          const [err] = ajvSchema.getValidationResult(date)
          expect(err, String(date)).toBeNull()
        })

        const invalidCases: any[] = ['2018-06-22']

        invalidCases.forEach(date => {
          const [err] = ajvSchema.getValidationResult(date)
          expect(err, String(date)).not.toBeNull()
        })
      })

      test('should reject invalid date for the rule', () => {
        const schema = j.string().isoDate().sameOrBefore('abcd')
        const [err] = AjvSchema.create(schema).getValidationResult('2018-06-21')
        expect(err).toMatchInlineSnapshot(`
          [AjvValidationError: Object is not the same or before abcd
          Input: 2018-06-21]
        `)
      })
    })

    describe('after', () => {
      test('should accept valid data', () => {
        const testCases: any[] = ['2018-06-22']
        const schema = j.string().isoDate().after('2018-06-21')
        const ajvSchema = AjvSchema.create(schema)

        testCases.forEach(date => {
          const [err] = ajvSchema.getValidationResult(date)
          expect(err, String(date)).toBeNull()
        })

        const invalidCases: any[] = ['2018-06-20', '2018-06-21']

        invalidCases.forEach(date => {
          const [err] = ajvSchema.getValidationResult(date)
          expect(err, String(date)).not.toBeNull()
        })
      })

      test('should reject invalid date for the rule', () => {
        const schema = j.string().isoDate().after('abcd')
        const [err] = AjvSchema.create(schema).getValidationResult('2018-06-21')
        expect(err).toMatchInlineSnapshot(`
          [AjvValidationError: Object is not after abcd
          Input: 2018-06-21]
        `)
      })
    })

    describe('sameOrAfter', () => {
      test('should accept valid data', () => {
        const testCases: any[] = ['2018-06-21', '2018-06-22']
        const schema = j.string().isoDate().sameOrAfter('2018-06-21')
        const ajvSchema = AjvSchema.create(schema)

        testCases.forEach(date => {
          const [err] = ajvSchema.getValidationResult(date)
          expect(err, String(date)).toBeNull()
        })

        const invalidCases: any[] = ['2018-06-20']

        invalidCases.forEach(date => {
          const [err] = ajvSchema.getValidationResult(date)
          expect(err, String(date)).not.toBeNull()
        })
      })

      test('should reject invalid date for the rule', () => {
        const schema = j.string().isoDate().sameOrAfter('abcd')
        const [err] = AjvSchema.create(schema).getValidationResult('2018-06-21')
        expect(err).toMatchInlineSnapshot(`
          [AjvValidationError: Object is not the same or after abcd
          Input: 2018-06-21]
        `)
      })
    })

    describe('between', () => {
      test('should accept valid data', () => {
        const testCases: any[] = ['2018-06-20', '2018-06-21', '2018-06-22']
        const schema = j.string().isoDate().between('2018-06-20', '2018-06-22', '[]')
        const ajvSchema = AjvSchema.create(schema)

        testCases.forEach(date => {
          const [err] = ajvSchema.getValidationResult(date)
          expect(err, String(date)).toBeNull()
        })

        const invalidCases: any[] = ['2018-06-19', '2018-06-23']

        invalidCases.forEach(date => {
          const [err] = ajvSchema.getValidationResult(date)
          expect(err, String(date)).not.toBeNull()
        })
      })

      test('should reject invalid date for the rule', () => {
        const schema1 = j.string().isoDate().between('abcd', '2018-06-22', '[]')
        const [err1] = AjvSchema.create(schema1).getValidationResult('2018-06-21')
        expect(err1).toMatchInlineSnapshot(`
          [AjvValidationError: Object is not the same or after abcd
          Input: 2018-06-21]
        `)

        const schema2 = j.string().isoDate().between('2018-06-20', 'abcd', '[]')
        const [err2] = AjvSchema.create(schema2).getValidationResult('2018-06-21')
        expect(err2).toMatchInlineSnapshot(`
          [AjvValidationError: Object is not the same or before abcd
          Input: 2018-06-21]
        `)
      })
    })
  })

  describe('IsoDateTime', () => {
    test('should work correctly with type inference', () => {
      const schema = j.string().isoDateTime()

      const [err, result] = AjvSchema.create(schema).getValidationResult('2025-10-15T01:01:01Z')

      expect(err).toBeNull()
      expect(result).toBe('2025-10-15T01:01:01Z')
      expectTypeOf(result).toEqualTypeOf<IsoDateTime>()
    })

    test('should reject with proper error message', () => {
      const schema = j.string().isoDateTime()

      const [err] = AjvSchema.create(schema).getValidationResult(
        'Second day of the second month of the year of the snake two candles after sunrise',
      )

      expect(err).toMatchInlineSnapshot(`
        [AjvValidationError: Object is an invalid IsoDateTime
        Input: Second day of the second month of the year of the snake two candles after sunrise]
      `)
    })

    test('should accept valid data', () => {
      const testCases = [
        '2001-01-01T01:01:01',
        '2001-01-01T01:01:01Z',
        '2001-01-01T01:01:01+14:00',
        '2001-01-01T01:01:01-12:00',
        '2000-02-29T01:01:01',
      ]
      const t = localTime.fromIsoDateTimeString('2001-01-01T01:01:01Z' as IsoDateTime)
      for (let i = 1; i < 366; ++i) {
        testCases.push(t.plusDays(i).toISODateTime())
      }
      const schema = j.string().isoDateTime()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(date => {
        const [err] = ajvSchema.getValidationResult(date)
        expect(err, String(date)).toBeNull()
      })
    })

    test('should reject invalid data', () => {
      const invalidCases = [
        'abcd',
        '20250930T070629Z', // valid ISO6801 but we don't support it
        '2001-01-01T01:01:01.001', // valid ISO6801 but we don't support it
        '2001-01-01T01:01:01.001', // valid ISO6801 but we don't support it
        '2001-01-01T01:01:01.001Z', // valid ISO6801 but we don't support it
        '2001-01-01T01:01:01.001+14:00', // valid ISO6801 but we don't support it
        '2001-01-01T01:01:01.001-12:00', // valid ISO6801 but we don't support it
        '20010-01-01T01:01:01', // 5 digit year
        '2001-13-01T01:01:01', // invalid month
        '2001-01-32T01:01:01', // invalid day
        '2001-01-01T24:01:01', // invalid hour
        '2001-01-01T01:60:01', // invalid minute
        '2001-01-01T01:01:60', // invalid second
        '2001-01-01T01:01:01.1000', // invalid millisecond
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
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(date => {
        const [err] = ajvSchema.getValidationResult(date)
        expect(err, String(date)).not.toBeNull()
      })
    })
  })

  describe('IsoMonth', () => {
    test('should work correctly with type inference', () => {
      const schema = j.string().isoMonth()

      const [err, result] = AjvSchema.create(schema).getValidationResult('2025-10')

      expect(err).toBeNull()
      expect(result).toBe('2025-10')
      expectTypeOf(result).toEqualTypeOf<IsoMonth>()
    })

    test('should reject with proper error message', () => {
      const schema = j.string().isoMonth()

      const [err] = AjvSchema.create(schema).getValidationResult('Second day of the second month')

      expect(err).toMatchInlineSnapshot(`
        [AjvValidationError: Object is an invalid IsoMonth
        Input: Second day of the second month]
      `)
    })

    test('should accept valid data', () => {
      const testCases: any[] = []
      const d = localDate.fromString('2001-01-01' as IsoDate)
      for (let i = 1; i < 366; ++i) {
        testCases.push(d.plusDays(i).toISOMonth())
      }
      const schema = j.string().isoMonth()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(date => {
        const [err] = ajvSchema.getValidationResult(date)
        expect(err, String(date)).toBeNull()
      })
    })

    test('should reject invalid data', () => {
      const invalidCases: any[] = [
        'abcd',
        '0-0',
        '202509',
        '20250930',
        '2025-W40-2',
        '2025-13',
        0,
        false,
        {},
        [],
      ]
      const schema = j.string().isoMonth()
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(date => {
        const [err] = ajvSchema.getValidationResult(date)
        expect(err, String(date)).not.toBeNull()
      })
    })
  })

  describe('jwt', () => {
    test('should accept string with valid JWT format', () => {
      const testCases = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30',
      ]
      const schema = j.string().jwt()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach((jwt, i) => {
        const [err] = ajvSchema.getValidationResult(jwt)
        expect(err, String(i)).toBeNull()
      })
    })

    test('should reject string with invalid JWT format', () => {
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
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach((jwt, i) => {
        const [err] = ajvSchema.getValidationResult(jwt)
        expect(err, String(i)).not.toBeNull()
      })
    })
  })

  describe('url', () => {
    test('should accept string with valid URL', () => {
      const testCases = ['https://nevergonna.giveyou.up']
      const schema = j.string().url()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(url => {
        const [err] = ajvSchema.getValidationResult(url)
        expect(err, String(url)).toBeNull()
      })
    })

    test('should reject string with invalid URL', () => {
      const invalidCases: any[] = ['not a URL', 0, true, [], {}]
      const schema = j.string().url()
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(url => {
        const [err] = ajvSchema.getValidationResult(url)
        expect(err, String(url)).not.toBeNull()
      })
    })

    test('should reject internationalized domain names (IDN)', () => {
      // IDNs are not supported because JSON Schema patterns don't support regex flags,
      // and the unicode flag is required to match non-ASCII characters.
      // Use punycode encoding (e.g., https://xn--mnchen-3ya.de) instead.
      const idnCases = ['https://münchen.de', 'https://日本.jp', 'https://中国.cn']
      const schema = j.string().url()
      const ajvSchema = AjvSchema.create(schema)

      idnCases.forEach(url => {
        const [err] = ajvSchema.getValidationResult(url)
        expect(err, `IDN URL should be rejected: ${url}`).not.toBeNull()
      })
    })
  })

  describe('ipv4', () => {
    test('should accept string with valid IPv4', () => {
      const testCases = ['127.0.0.1', '192.168.0.1']
      const schema = j.string().ipv4()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(ipv4 => {
        const [err] = ajvSchema.getValidationResult(ipv4)
        expect(err, String(ipv4)).toBeNull()
      })
    })

    test('should reject string with invalid IPv4', () => {
      const invalidCases: any[] = ['192.168.0.1/255.255.255.0', 'not a ipv4', 0, true, [], {}]
      const schema = j.string().ipv4()
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(ipv4 => {
        const [err] = ajvSchema.getValidationResult(ipv4)
        expect(err, String(ipv4)).not.toBeNull()
      })
    })
  })

  describe('ipv6', () => {
    test('should accept string with valid IPv6', () => {
      const testCases = [
        '2001:0db8:0000:0000:0000:ff00:0042:8329', // lowercase
        '2001:0DB8:0000:0000:0000:FF00:0042:8329', // uppercase
        '2001:db8:0:0:0:ff00:42:8329',
        '2001:db8::ff00:42:8329',
        '0000:0000:0000:0000:0000:0000:0000:0001',
        '::1',
      ]
      const schema = j.string().ipv6()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(ipv6 => {
        const [err] = ajvSchema.getValidationResult(ipv6)
        expect(err, String(ipv6)).toBeNull()
      })
    })

    test('should reject string with invalid IPv6', () => {
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
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(ipv6 => {
        const [err] = ajvSchema.getValidationResult(ipv6)
        expect(err, String(ipv6)).not.toBeNull()
      })
    })
  })

  describe('slug', () => {
    test('should accept string with valid slug', () => {
      const testCases = ['some-slug', '012345']
      const schema = j.string().slug()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(slug => {
        const [err] = ajvSchema.getValidationResult(slug)
        expect(err, String(slug)).toBeNull()
      })
    })

    test('should reject string with invalid slug', () => {
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
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(slug => {
        const [err] = ajvSchema.getValidationResult(slug)
        expect(err, String(slug)).not.toBeNull()
      })
    })
  })

  describe('semVer', () => {
    test('should accept string with valid semver', () => {
      const testCases = ['0.0.0', '1.2.3']
      const schema = j.string().semVer()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(semver => {
        const [err] = ajvSchema.getValidationResult(semver)
        expect(err, String(semver)).toBeNull()
      })
    })

    test('should reject string with invalid semver', () => {
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
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(semver => {
        const [err] = ajvSchema.getValidationResult(semver)
        expect(err, String(semver)).not.toBeNull()
      })
    })
  })

  describe('languageTag', () => {
    test('should accept string with valid languageTag', () => {
      const testCases = ['hu-HU', 'en-US', 'se-SE', 'se']
      const schema = j.string().languageTag()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(languageTag => {
        const [err] = ajvSchema.getValidationResult(languageTag)
        expect(err, String(languageTag)).toBeNull()
      })
    })

    test('should reject string with invalid languageTag', () => {
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
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(languageTag => {
        const [err] = ajvSchema.getValidationResult(languageTag)
        expect(err, String(languageTag)).not.toBeNull()
      })
    })
  })

  describe('countryCode', () => {
    test('should accept string with valid countryCode', () => {
      const testCases = ['SE', 'HU']
      const schema = j.string().countryCode()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(countryCode => {
        const [err] = ajvSchema.getValidationResult(countryCode)
        expect(err, String(countryCode)).toBeNull()
      })
    })

    test('should reject string with invalid countryCode', () => {
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
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(countryCode => {
        const [err] = ajvSchema.getValidationResult(countryCode)
        expect(err, String(countryCode)).not.toBeNull()
      })
    })
  })

  describe('currency', () => {
    test('should accept string with valid currency', () => {
      const testCases = ['SEK', 'HUF', 'EUR', 'USD']
      const schema = j.string().currency()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(currency => {
        const [err] = ajvSchema.getValidationResult(currency)
        expect(err, String(currency)).toBeNull()
      })
    })

    test('should reject string with invalid currency', () => {
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
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(currency => {
        const [err] = ajvSchema.getValidationResult(currency)
        expect(err, String(currency)).not.toBeNull()
      })
    })
  })

  describe('ianaTimezone', () => {
    test('should work correctly with type inference', () => {
      const schema = j.string().ianaTimezone()

      const [err, result] = AjvSchema.create(schema).getValidationResult('Europe/Stockholm')

      expect(err).toBeNull()
      expect(result).toBe('Europe/Stockholm')
      expectTypeOf(result).toEqualTypeOf<IANATimezone>()
    })

    test('should support "UTC" as we sometimes use it in unit tests', () => {
      const schema = j.string().ianaTimezone()

      const [err] = AjvSchema.create(schema).getValidationResult('UTC')

      expect(err).toBeNull()
    })

    test('should reject with proper error message', () => {
      const schema = j.string().ianaTimezone()

      const [err] = AjvSchema.create(schema).getValidationResult(
        'Second day of the second month of the year of the snake',
      )

      expect(err).toMatchInlineSnapshot(`
        [AjvValidationError: Object is an invalid IANA timezone
        Input: Second day of the second month of the year of the snake]
      `)
    })

    test('should accept valid data', () => {
      const testCases = [...Intl.supportedValuesOf('timeZone'), 'UTC']
      const schema = j.string().ianaTimezone()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(tz => {
        const [err] = ajvSchema.getValidationResult(tz)
        expect(err, String(tz)).toBeNull()
      })
    })

    test('should reject invalid data', () => {
      const invalidCases: any[] = ['abcd', 0, null, [], {}]
      const schema = j.string().ianaTimezone()
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('base64Url', () => {
    test('should accept valid data', () => {
      const testCases = ['azAZ09_-']
      const schema = j.string().base64Url()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })

      const invalidCases = ['!', '#', '+', '%', '<']
      invalidCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('uuid', () => {
    test('should accept valid data', () => {
      const testCases = [
        '257631be-26d6-4a18-b28e-4bb7c6495cf4', // lowercase
        '257631BE-26D6-4A18-B28E-4BB7C6495CF4', // uppercase (valid per RFC 4122)
        '257631Be-26d6-4A18-b28e-4Bb7c6495Cf4', // mixed case
      ]
      const schema = j.string().uuid()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
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
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })
})

describe('number', () => {
  test('should work correctly with type inference', () => {
    const schema = j.number()

    const [err, result] = AjvSchema.create(schema).getValidationResult(0)

    expect(err).toBeNull()
    expect(result).toBe(0)
    expectTypeOf(result).toEqualTypeOf<number>()
  })

  test('should accept a number with a valid value', () => {
    const testCases = [-2, 0, 2, 3.14]
    const schema = j.number()
    const ajvSchema = AjvSchema.create(schema)

    testCases.forEach(value => {
      const [err] = ajvSchema.getValidationResult(value)
      expect(err, String(value)).toBeNull()
    })
  })

  test('should reject a number with an invalid value', () => {
    const invalidCases: any[] = [Number.NaN, Number.POSITIVE_INFINITY, 'a', true, {}, []]
    const schema = j.number()
    const ajvSchema = AjvSchema.create(schema)

    invalidCases.forEach(value => {
      const [err] = ajvSchema.getValidationResult(value)
      expect(err, String(value)).not.toBeNull()
    })
  })

  describe('optional(values)', () => {
    test('should convert specific values to `undefined`', () => {
      const schema = j.object<{ foo?: number }>({ foo: j.number().optional([6147]) })

      const [err1, result1] = AjvSchema.create(schema).getValidationResult({ foo: 1234 })

      expect(err1).toBeNull()
      expect(result1).toEqual({ foo: 1234 })

      const [err2, result2] = AjvSchema.create(schema).getValidationResult({ foo: 6147 })

      expect(err2).toBeNull()
      expect(result2).toEqual({})

      const [err3, result3] = AjvSchema.create(schema).getValidationResult({})

      expect(err3).toBeNull()
      expect(result3).toEqual({})
    })

    test('should work with `null` values', () => {
      const schema = j.object<{ foo?: number }>({ foo: j.number().optional([null]) })
      const ajvSchema = AjvSchema.create(schema)

      const [err1, result1] = ajvSchema.getValidationResult({ foo: 1 })
      expect(err1).toBeNull()
      expect(result1).toEqual({ foo: 1 })

      const [err2, result2] = ajvSchema.getValidationResult({ foo: null } as any)
      expect(err2).toBeNull()
      expect(result2).toEqual({ foo: undefined })
    })

    test('should not allow chaining after `optional([null])` (compile-time error)', () => {
      const schema = j.number().optional([null])
      // When `null` is included in optionalValues, the return type is JsonSchemaTerminal,
      // which doesn't have number-specific methods like min().
      // This prevents mistakes at compile time rather than failing at runtime.
      // @ts-expect-error - min doesn't exist on JsonSchemaTerminal
      expect(() => schema.min(1)).toThrow(TypeError)
    })

    test('should throw when used on a standalone schema (and not in an object/array)', () => {
      const schema = j.number().optional([112])
      const ajvSchema = AjvSchema.create(schema)

      expect(() => ajvSchema.isValid(2342)).toThrowErrorMatchingInlineSnapshot(
        `[AssertionError: You should only use \`optional([x, y, z]) on a property of an object, or on an element of an array due to Ajv mutation issues.]`,
      )
    })

    test('should still be an optional field when passing in `null`', () => {
      const schema = j.object<{ foo?: number }>({ foo: j.number().optional([null]) })
      const ajvSchema = AjvSchema.create(schema)

      const [err1, result1] = ajvSchema.getValidationResult({})
      expect(err1).toBeNull()
      expect(result1).toEqual({})
    })
  })

  describe('multipleOf', () => {
    test('should accept a number with a valid value', () => {
      const testCases = [-2, 0, 2, 4]
      const schema = j.number().multipleOf(2)
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    test('should reject a number with an invalid value', () => {
      const invalidCases = [1, 3]
      const schema = j.number().multipleOf(2)
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('min', () => {
    test('should accept a number with a valid value', () => {
      const testCases = [2, 3, 4]
      const schema = j.number().min(2)
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    test('should reject a number with an invalid value', () => {
      const invalidCases = [1, 1.9999]
      const schema = j.number().min(2)
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('exclusiveMin', () => {
    test('should accept a number with a valid value', () => {
      const testCases = [2.0001, 3, 4]
      const schema = j.number().exclusiveMin(2)
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    test('should reject a number with an invalid value', () => {
      const invalidCases = [1, 1.9999, 2]
      const schema = j.number().exclusiveMin(2)
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('max', () => {
    test('should accept a number with a valid value', () => {
      const testCases = [0, 1, 2]
      const schema = j.number().max(2)
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    test('should reject a number with an invalid value', () => {
      const invalidCases = [2.0001, 3, 4]
      const schema = j.number().max(2)
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('exclusiveMax', () => {
    test('should accept a number with a valid value', () => {
      const testCases = [0, 1, 1.9999]
      const schema = j.number().exclusiveMax(2)
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    test('should reject a number with an invalid value', () => {
      const invalidCases = [2, 3, 4]
      const schema = j.number().exclusiveMax(2)
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('moreThanOrEqual', () => {
    test('should accept a number with a valid value', () => {
      const testCases = [2, 3, 4]
      const schema = j.number().moreThanOrEqual(2)
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    test('should reject a number with an invalid value', () => {
      const invalidCases = [1, 1.9999]
      const schema = j.number().moreThanOrEqual(2)
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('moreThan', () => {
    test('should accept a number with a valid value', () => {
      const testCases = [2.0001, 3, 4]
      const schema = j.number().moreThan(2)
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    test('should reject a number with an invalid value', () => {
      const invalidCases = [1, 1.9999, 2]
      const schema = j.number().moreThan(2)
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('lessThanOrEqual', () => {
    test('should accept a number with a valid value', () => {
      const testCases = [0, 1, 2]
      const schema = j.number().lessThanOrEqual(2)
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    test('should reject a number with an invalid value', () => {
      const invalidCases = [2.0001, 3, 4]
      const schema = j.number().lessThanOrEqual(2)
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('lessThan', () => {
    test('should accept a number with a valid value', () => {
      const testCases = [0, 1, 1.9999]
      const schema = j.number().lessThan(2)
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    test('should reject a number with an invalid value', () => {
      const invalidCases = [2, 3, 4]
      const schema = j.number().lessThan(2)
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('equal', () => {
    test('should accept a number with a valid value', () => {
      const testCases = [2]
      const schema = j.number().equal(2)
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    test('should reject a number with an invalid value', () => {
      const invalidCases = [1.9, 2.1]
      const schema = j.number().equal(2)
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('range', () => {
    describe('[]', () => {
      test('should accept a number with a valid value', () => {
        const testCases = [2, 2.5, 3]
        const schema = j.number().range(2, 3, '[]')
        const ajvSchema = AjvSchema.create(schema)

        testCases.forEach(value => {
          const [err] = ajvSchema.getValidationResult(value)
          expect(err, String(value)).toBeNull()
        })
      })

      test('should reject a number with an invalid value', () => {
        const invalidCases = [1, 1.999, 3.001, 4]
        const schema = j.number().range(2, 3, '[]')
        const ajvSchema = AjvSchema.create(schema)

        invalidCases.forEach(value => {
          const [err] = ajvSchema.getValidationResult(value)
          expect(err, String(value)).not.toBeNull()
        })
      })
    })

    describe('[)', () => {
      test('should accept a number with a valid value', () => {
        const testCases = [2, 2.5, 2.9]
        const schema = j.number().range(2, 3, '[)')
        const ajvSchema = AjvSchema.create(schema)

        testCases.forEach(value => {
          const [err] = ajvSchema.getValidationResult(value)
          expect(err, String(value)).toBeNull()
        })
      })

      test('should reject a number with an invalid value', () => {
        const invalidCases = [1, 1.999, 3, 3.001, 4]
        const schema = j.number().range(2, 3, '[)')
        const ajvSchema = AjvSchema.create(schema)

        invalidCases.forEach(value => {
          const [err] = ajvSchema.getValidationResult(value)
          expect(err, String(value)).not.toBeNull()
        })
      })
    })
  })

  describe('int32', () => {
    test('should accept a number with a valid value', () => {
      const testCases = [-(2 ** 31), 0, 2 ** 31 - 1]
      const schema = j.number().int32()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    test('should reject a number with an invalid value', () => {
      const invalidCases = [-(2 ** 31) - 1, 2 ** 31]
      const schema = j.number().int32()
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })

    test('should not update already set min or max within valid boundaries', () => {
      const testCases = [2, 3]
      const schema = j.number().min(2).max(3).int32()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })

      const invalidCases = [1, 4]
      invalidCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('int64', () => {
    test('should accept a number with a valid value', () => {
      const testCases = [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]
      const schema = j.number().int64()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    test('should reject a number with an invalid value', () => {
      const invalidCases = [Number.MIN_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER + 1]
      const schema = j.number().int64()
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  // empty, because float is all JS numbers
  // describe('float', () => {})

  // empty, because double is all JS numbers
  // describe('double', () => {})

  describe('unixTimestamp', () => {
    test('should brand the value', () => {
      const schema = j.number().unixTimestamp()
      const ajvSchema = AjvSchema.create(schema)
      const [, result] = ajvSchema.getValidationResult(0 as UnixTimestamp)
      expectTypeOf(result).toEqualTypeOf<UnixTimestamp>()
    })

    test('should accept a number with a valid value', () => {
      const testCases = [0, localTime('2500-01-01T00:00:00Z' as IsoDateTime).unix]
      const schema = j.number().unixTimestamp()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value as UnixTimestamp)
        expect(err, String(value)).toBeNull()
      })
    })

    test('should reject a number with an invalid value', () => {
      const invalidCases = [
        -1,
        0.1,
        localTime('2500-01-01T00:00:00Z' as IsoDateTime).plusSeconds(1).unix,
      ]
      const schema = j.number().unixTimestamp()
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value as UnixTimestamp)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('unixTimestamp2000', () => {
    test('should brand the value', () => {
      const schema = j.number().unixTimestamp2000()
      const ajvSchema = AjvSchema.create(schema)
      const [, result] = ajvSchema.getValidationResult(0 as UnixTimestamp)
      expectTypeOf(result).toEqualTypeOf<UnixTimestamp>()
    })

    test('should accept a number with a valid value', () => {
      const testCases = [
        localTime('2000-01-01T00:00:00Z' as IsoDateTime).unix,
        localTime('2500-01-01T00:00:00Z' as IsoDateTime).unix,
      ]
      const schema = j.number().unixTimestamp2000()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    test('should reject a number with an invalid value', () => {
      const invalidCases = [
        localTime('2000-01-01T00:00:00Z' as IsoDateTime).minusSeconds(1).unix,
        localTime('2500-01-01T00:00:00Z' as IsoDateTime).plusSeconds(1).unix,
        0.1,
      ]
      const schema = j.number().unixTimestamp2000()
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value as UnixTimestamp)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('unixTimestampMillis', () => {
    test('should brand the value', () => {
      const schema = j.number().unixTimestampMillis()
      const ajvSchema = AjvSchema.create(schema)
      const [, result] = ajvSchema.getValidationResult(0 as UnixTimestampMillis)
      expectTypeOf(result).toEqualTypeOf<UnixTimestampMillis>()
    })

    test('should accept a number with a valid value', () => {
      const testCases = [0, localTime('2500-01-01T00:00:00Z' as IsoDateTime).unixMillis]
      const schema = j.number().unixTimestampMillis()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value as UnixTimestampMillis)
        expect(err, String(value)).toBeNull()
      })
    })

    test('should reject a number with an invalid value', () => {
      const invalidCases = [
        -1,
        0.1,
        localTime('2500-01-01T00:00:00Z' as IsoDateTime).plusSeconds(1).unixMillis,
      ]
      const schema = j.number().unixTimestampMillis()
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value as UnixTimestampMillis)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('unixTimestamp2000Millis', () => {
    test('should brand the value', () => {
      const schema = j.number().unixTimestamp2000Millis()
      const ajvSchema = AjvSchema.create(schema)
      const [, result] = ajvSchema.getValidationResult(0 as UnixTimestampMillis)
      expectTypeOf(result).toEqualTypeOf<UnixTimestampMillis>()
    })

    test('should accept a number with a valid value', () => {
      const testCases = [
        localTime('2000-01-01T00:00:00Z' as IsoDateTime).unixMillis,
        localTime('2500-01-01T00:00:00Z' as IsoDateTime).unixMillis,
      ]
      const schema = j.number().unixTimestamp2000Millis()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    test('should reject a number with an invalid value', () => {
      const invalidCases = [
        localTime('2000-01-01T00:00:00Z' as IsoDateTime).minusSeconds(1).unixMillis,
        localTime('2500-01-01T00:00:00Z' as IsoDateTime).plusSeconds(1).unixMillis,
        0.1,
      ]
      const schema = j.number().unixTimestamp2000Millis()
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value as UnixTimestampMillis)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('utcOffset', () => {
    test('should accept a number with a valid value', () => {
      const testCases = [-12 * 60, 0, 14 * 60]
      const schema = j.number().utcOffset()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    test('should reject a number with an invalid value', () => {
      const invalidCases = [
        0.1, // non-integer
        14, // not a multiple of 15
        -13 * 60, // out of lower bound
        15 * 60, // out of upper bound
      ]
      const schema = j.number().utcOffset()
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('utcOffsetHour', () => {
    test('should accept a number with a valid value', () => {
      const testCases = [-12, 0, 14]
      const schema = j.number().utcOffsetHour()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    test('should reject a number with an invalid value', () => {
      const invalidCases = [
        0.1, // non-integer
        -13, // out of lower bound
        15, // out of upper bound
      ]
      const schema = j.number().utcOffsetHour()
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })
})

describe('boolean', () => {
  test('should work correctly with type inference', () => {
    const schema = j.boolean()

    const [err, result] = AjvSchema.create(schema).getValidationResult(true)

    expect(err).toBeNull()
    expect(result).toBe(true)
    expectTypeOf(result).toEqualTypeOf<boolean>()
  })

  test('should accept a boolean with a valid value', () => {
    const testCases = [true, false]
    const schema = j.boolean()
    const ajvSchema = AjvSchema.create(schema)

    testCases.forEach(value => {
      const [err] = ajvSchema.getValidationResult(value)
      expect(err, String(value)).toBeNull()
    })
  })

  test('should reject a boolean with an invalid value', () => {
    const invalidCases: any[] = ['a', 0, {}, []]
    const schema = j.boolean()
    const ajvSchema = AjvSchema.create(schema)

    invalidCases.forEach(value => {
      const [err] = ajvSchema.getValidationResult(value)
      expect(err, String(value)).not.toBeNull()
    })
  })

  describe('optional(values)', () => {
    test('should convert specific values to `undefined`', () => {
      const schema = j.object<{ foo?: boolean }>({ foo: j.boolean().optional(false) })

      const [err1, result1] = AjvSchema.create(schema).getValidationResult({ foo: true })

      expect(err1).toBeNull()
      expect(result1).toEqual({ foo: true })

      const [err2, result2] = AjvSchema.create(schema).getValidationResult({ foo: false })

      expect(err2).toBeNull()
      expect(result2).toEqual({})

      const [err3, result3] = AjvSchema.create(schema).getValidationResult({})

      expect(err3).toBeNull()
      expect(result3).toEqual({})
    })
  })
})

describe('array', () => {
  test('should work correctly with type inference', () => {
    const schema = j.array(j.string().nullable())

    const [err, result] = AjvSchema.create(schema).getValidationResult(['foo', null])

    expect(err).toBeNull()
    expect(result).toEqual(['foo', null])
    expectTypeOf(result).toEqualTypeOf<(string | null)[]>()
  })

  test('should accept valid data', () => {
    const testCases: any[] = [
      [j.string(), []],
      [j.string(), ['foo', 'bar']],
      [j.string().nullable(), ['foo', null]],
    ]

    testCases.forEach(([itemSchema, input]) => {
      const schema = j.array(itemSchema)

      const [err, result] = AjvSchema.create(schema).getValidationResult(input)

      expect(err, String(input)).toBeNull()
      expect(result).toEqual(input)
    })
  })

  test('should reject invalid data', () => {
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

      const [err] = AjvSchema.create(schema).getValidationResult(input)

      expect(err, String(input)).not.toBeNull()
    })
  })

  describe('minLength', () => {
    test('should accept valid data', () => {
      const testCases: any[] = [
        ['foo', 'bar'],
        ['foo', 'bar', 'shu'],
      ]
      const schema = j.array(j.string()).minLength(2)
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(input => {
        const [err, result] = ajvSchema.getValidationResult(input)

        expect(err, String(input)).toBeNull()
        expect(result).toEqual(input)
      })
    })

    test('should reject invalid data', () => {
      const testCases: any[] = [[], ['foo'], 0, 'foo', {}, true]
      const schema = j.array(j.string()).minLength(2)
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(input => {
        const [err] = ajvSchema.getValidationResult(input)

        expect(err, String(input)).not.toBeNull()
      })
    })
  })

  describe('maxLength', () => {
    test('should accept valid data', () => {
      const testCases: any[] = [[], ['foo'], ['foo', 'bar']]
      const schema = j.array(j.string()).maxLength(2)
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(input => {
        const [err, result] = ajvSchema.getValidationResult(input)

        expect(err, String(input)).toBeNull()
        expect(result).toEqual(input)
      })
    })

    test('should reject invalid data', () => {
      const testCases: any[] = [['foo', 'bar', 'shu'], 0, 'foo', {}, true]
      const schema = j.array(j.string()).maxLength(2)
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(input => {
        const [err] = ajvSchema.getValidationResult(input)

        expect(err, String(input)).not.toBeNull()
      })
    })
  })

  describe('length(min, max)', () => {
    test('should accept valid data', () => {
      const schema = j.array(j.string()).length(1, 2)
      const ajvSchema = AjvSchema.create(schema)

      const validCases: any[] = [['foo'], ['foo', 'bar']]
      validCases.forEach(input => {
        const [err, result] = ajvSchema.getValidationResult(input)

        expect(err, String(input)).toBeNull()
        expect(result).toEqual(input)
      })

      const invalidCases: any[] = [[], ['foo', 'bar', 'shu']]
      invalidCases.forEach(input => {
        const [err] = ajvSchema.getValidationResult(input)

        expect(err, String(input)).not.toBeNull()
      })
    })
  })

  describe('length(eq)', () => {
    test('should accept valid data', () => {
      const schema = j.array(j.string()).length(2)
      const ajvSchema = AjvSchema.create(schema)

      const validCases: any[] = [['foo', 'bar']]
      validCases.forEach(input => {
        const [err, result] = ajvSchema.getValidationResult(input)

        expect(err, String(input)).toBeNull()
        expect(result).toEqual(input)
      })

      const invalidCases: any[] = [[], ['foo'], ['foo', 'bar', 'shu']]
      invalidCases.forEach(input => {
        const [err] = ajvSchema.getValidationResult(input)

        expect(err, String(input)).not.toBeNull()
      })
    })
  })

  describe('exactLength', () => {
    test('should accept valid data', () => {
      const schema = j.array(j.string()).exactLength(2)
      const ajvSchema = AjvSchema.create(schema)

      const validCases: any[] = [['foo', 'bar']]
      validCases.forEach(input => {
        const [err, result] = ajvSchema.getValidationResult(input)

        expect(err, String(input)).toBeNull()
        expect(result).toEqual(input)
      })

      const invalidCases: any[] = [[], ['foo'], ['foo', 'bar', 'shu']]
      invalidCases.forEach(input => {
        const [err] = ajvSchema.getValidationResult(input)

        expect(err, String(input)).not.toBeNull()
      })
    })
  })
})

describe('tuple', () => {
  test('should work correctly with type inference', () => {
    const schema = j.tuple([j.string().nullable(), j.number(), j.boolean()])

    const [err, result] = AjvSchema.create(schema).getValidationResult(['foo', 1, true])

    expect(err).toBeNull()
    expect(result).toEqual(['foo', 1, true])
    expectTypeOf(result).toExtend<[string | null, number, boolean]>()
  })

  test('should accept valid data', () => {
    const schema = j.tuple([j.string().minLength(3).nullable(), j.number(), j.boolean()])
    const ajvSchema = AjvSchema.create(schema)

    const testCases: any[] = [
      ['foo', 1, true],
      [null, 2, false],
    ]
    testCases.forEach(input => {
      const [err, result] = ajvSchema.getValidationResult(input)

      expect(err, String(input)).toBeNull()
      expect(result).toEqual(input)
    })

    const invalidCases: any[] = [[undefined, 1, true], ['fo', 1, true], 'foo', 0, true, {}, []]
    invalidCases.forEach(input => {
      const [err] = ajvSchema.getValidationResult(input)
      expect(err, String(input)).not.toBeNull()
    })
  })
})

describe('set', () => {
  test('should work correctly with type inference', () => {
    const schema = j.set(j.string())

    const [err, result] = AjvSchema.create(schema).getValidationResult(new Set2(['foo', 'bar']))

    expect(err).toBeNull()
    expect(result).toBeInstanceOf(Set2)
    expect(result.toArray()).toEqual(['foo', 'bar'])
    expectTypeOf(result).toEqualTypeOf<Set2<string>>()
  })

  test('should accept valid data', () => {
    const testCases: any[] = [
      [j.string(), new Set2(['foo', 'bar'])],
      [j.string().nullable(), new Set2(['foo', null])],
      [j.array(j.string()), new Set2([['foo'], ['bar']])],
    ]

    testCases.forEach(([itemSchema, input]) => {
      const schema = j.set(itemSchema)

      const [err] = AjvSchema.create(schema).getValidationResult(input)

      expect(err, String(input)).toBeNull()
    })
  })

  test('should reject invalid data', () => {
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

      const [err] = AjvSchema.create(schema).getValidationResult(input)

      expect(err, String(input)).not.toBeNull()
    })
  })

  test('should NOT accept an Array - when it is a standalone schema', () => {
    const schema = j.set(j.string())

    const [err] = AjvSchema.create(schema).getValidationResult(['foo', 'bar'])

    expect(err).toMatchInlineSnapshot(`
      [AjvValidationError: Object can only transform an Iterable into a Set2 when the schema is in an object or an array schema. This is an Ajv limitation.
      Input: [ 'foo', 'bar' ]]
    `)
  })

  test('should accept an Array and produce a Set2 - when it is a property of an object', () => {
    const schema = j.object.infer({ set: j.set(j.string()) }).isOfType<{ set: Set2<string> }>()

    const [err, result] = AjvSchema.create(schema).getValidationResult({ set: ['foo', 'bar'] })

    expect(err).toBeNull()
    expect(result.set).toBeInstanceOf(Set2)
    expect(result.set.toArray()).toEqual(['foo', 'bar'])
    expectTypeOf(result).toEqualTypeOf<{ set: Set2<string> }>()
  })

  test('should automagically make an Array unique', () => {
    const schema = j.object.infer({ set: j.set(j.string()) }).isOfType<{ set: Set2<string> }>()

    const [err, result] = AjvSchema.create(schema).getValidationResult({
      set: ['foo', 'bar', 'foo'],
    })

    expect(err).toBeNull()
    expect(result.set.toArray()).toEqual(['foo', 'bar'])
  })
})

describe('object', () => {
  test('should work correctly with the passed-in type', () => {
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

    const [err, result] = AjvSchema.create(schema).getValidationResult({
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

  test('should work correctly with type assignment', () => {
    interface Foo {
      string: string
      stringOptional?: string
    }

    const schema = j.object<Foo>({
      string: j.string(),
      stringOptional: j.string().optional(),
    })

    const [, result] = AjvSchema.create(schema).getValidationResult({} as any)

    expectTypeOf(result).toEqualTypeOf<Foo>()
  })

  test('should reject when required properties are missing', () => {
    interface Foo {
      foo: string
      bar?: string
      missing: boolean
    }

    // @ts-expect-error
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
    test('should work correctly with type assignment', () => {
      interface Foo {
        foo: string | null
        bar?: number
      }
      const schema1 = j.object<{ foo: string | null }>({ foo: j.string().nullable() })
      const schema2 = schema1.extend({ bar: j.number().optional() }).isOfType<Foo>()

      const [, result] = AjvSchema.create(schema2).getValidationResult({
        foo: 'asdf',
        bar: 0,
      })

      expectTypeOf(result).toExtend<Foo>()
    })

    test('should not work without passing in a type', () => {
      const schema1 = j.object<{ foo: string | null }>({ foo: j.string().nullable() })
      const schema2 = schema1.extend({ bar: j.number().optional() })

      const fn = () => AjvSchema.create(schema2)
      expect(fn).toThrow(
        'The schema must be type checked against a type or interface, using the `.isOfType()` helper in `j`.',
      )
    })

    test('should accept a valid object', () => {
      interface Foo {
        foo: string | null
        bar: number
      }
      const schema1 = j.object<{ foo: string | null }>({ foo: j.string().nullable() })
      const schema2 = schema1.extend({ bar: j.number() }).isOfType<Foo>()
      const ajvSchema = AjvSchema.create(schema2)

      const testCases = [{ foo: 'foo', bar: 1 }]
      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
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
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, _stringify(value)).not.toBeNull()
      })
    })

    test('should work with property narrowing', () => {
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

      const ajvSchema = AjvSchema.create(schema2)

      const [, result] = ajvSchema.getValidationResult({
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
        const [err] = ajvSchema.getValidationResult(value)
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
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, _stringify(value)).not.toBeNull()
      })
    })

    test('should be logical', () => {
      interface Foo {
        bar: string
      }

      const schema1 = j.object<Foo>({ bar: j.string() })
      const schema2 = schema1.extend({}).isOfType<Foo>()

      const [, result] = AjvSchema.create(schema2).getValidationResult({
        bar: 'asdf',
      })

      expectTypeOf(result).toExtend<Foo>()
    })

    test('it should work with dbEntity', () => {
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

      const [, result] = AjvSchema.create(schema2).getValidationResult({
        foo: 'bar',
        bar: {
          shu: 1,
        },
      })

      expectTypeOf(result).toExtend<Bar>()
    })
  })

  describe('concat', () => {
    test('should work correctly with type assignment', () => {
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

      const [err, result] = AjvSchema.create(shuSchema).getValidationResult({
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

    test('should throw without `isOfType` check', () => {
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
    test('should strip away unspecified properties during validation when not set', () => {
      const schema = j.object
        .infer({
          string: j.string(),
        })
        .isOfType<{ string: string }>()

      const [, result] = AjvSchema.create(schema).getValidationResult({
        string: 'hello',
        foo: 'world',
      } as any)

      expect(result).toEqual({ string: 'hello' })
    })

    test('should not strip away unspecified properties during validation when set', () => {
      const schema = j.object
        .infer({
          string: j.string(),
        })
        .allowAdditionalProperties()
        .isOfType<{ string: string }>()

      const [, result] = AjvSchema.create(schema).getValidationResult({
        string: 'hello',
        foo: 'world',
      } as any)

      expect(result).toEqual({
        string: 'hello',
        foo: 'world',
      })
    })
  })

  describe('.dbEntity', () => {
    test('should work correctly with type inference', () => {
      interface DB extends BaseDBEntity {
        foo: string
      }

      // @ts-expect-error
      const _wrongSchema = j.object.dbEntity<DB>({ foo: j.number() })

      const schema = j.object.dbEntity<DB>({ foo: j.string() })

      const [err, result] = AjvSchema.create(schema).getValidationResult({
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
  })

  describe('.infer', () => {
    test('should work correctly with type inference', () => {
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

      const [err, result] = AjvSchema.create(schema).getValidationResult({
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

    test('should work correctly with type assignment', () => {
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

      const [, result] = AjvSchema.create(schema).getValidationResult({} as any)

      expectTypeOf(result).toEqualTypeOf<Foo>()
    })

    test('should reject when required properties are missing', () => {
      const schema = j.object
        .infer({ foo: j.string(), bar: j.string().optional() })
        .isOfType<{ foo: string; bar?: string }>()
      const ajvSchema = AjvSchema.create(schema)

      const [err1] = ajvSchema.getValidationResult({ foo: 'foo', bar: 'bar' })
      expect(err1).toBeNull()

      const [err2] = ajvSchema.getValidationResult({ foo: 'foo' })
      expect(err2).toBeNull()

      const [err3] = ajvSchema.getValidationResult({ bar: 'bar' } as any)
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
      test('should work correctly with type assignment', () => {
        interface Foo {
          foo: string | null
          bar?: number
        }
        const schema1 = j.object.infer({ foo: j.string().nullable() })
        const schema2 = schema1.extend({ bar: j.number().optional() }).isOfType<Foo>()

        const [, result] = AjvSchema.create(schema2).getValidationResult({
          foo: 'asdf',
          bar: 0,
        })

        expectTypeOf(result).toEqualTypeOf<Foo>()
      })
    })

    describe('allowAdditionalProperties', () => {
      test('should strip away unspecified properties during validation when not set', () => {
        const schema = j.object
          .infer({
            string: j.string(),
          })
          .isOfType<{ string: string }>()

        const [, result] = AjvSchema.create(schema).getValidationResult({
          string: 'hello',
          foo: 'world',
        } as any)

        expect(result).toEqual({ string: 'hello' })
      })

      test('should not strip away unspecified properties during validation when set', () => {
        const schema = j.object
          .infer({
            string: j.string(),
          })
          .allowAdditionalProperties()
          .isOfType<{ string: string }>()

        const [, result] = AjvSchema.create(schema).getValidationResult({
          string: 'hello',
          foo: 'world',
        } as any)

        expect(result).toEqual({
          string: 'hello',
          foo: 'world',
        })
      })
    })
  })

  describe('.any', () => {
    test('should work correctly with type inference', () => {
      const schema = j.object.any()

      const [err, result] = AjvSchema.create(schema).getValidationResult({ foo: 'bar' })

      expect(err).toBeNull()
      expect(result).toEqual({ foo: 'bar' })
      expectTypeOf(result).toEqualTypeOf<AnyObject>()
    })
  })

  describe('optional(null)', () => {
    test('should convert `null` to `undefined` for j.object', () => {
      interface Inner {
        foo: string
      }
      interface Outer {
        inner?: Inner
      }
      const schema = j.object<Outer>({
        inner: j.object<Inner>({ foo: j.string() }).optional(null),
      })
      const ajvSchema = AjvSchema.create(schema)

      const [err1, result1] = ajvSchema.getValidationResult({ inner: { foo: 'bar' } })
      expect(err1).toBeNull()
      expect(result1).toEqual({ inner: { foo: 'bar' } })

      const [err2, result2] = ajvSchema.getValidationResult({ inner: null } as any)
      expect(err2).toBeNull()
      expect(result2).toEqual({ inner: undefined })

      const [err3, result3] = ajvSchema.getValidationResult({})
      expect(err3).toBeNull()
      expect(result3).toEqual({})
    })

    test('should convert `null` to `undefined` for j.object.infer', () => {
      interface Outer {
        inner?: { foo: string }
      }
      const schema = j.object<Outer>({
        inner: j.object.infer({ foo: j.string() }).optional(null),
      })
      const ajvSchema = AjvSchema.create(schema)

      const [err1, result1] = ajvSchema.getValidationResult({ inner: { foo: 'bar' } })
      expect(err1).toBeNull()
      expect(result1).toEqual({ inner: { foo: 'bar' } })

      const [err2, result2] = ajvSchema.getValidationResult({ inner: null } as any)
      expect(err2).toBeNull()
      expect(result2).toEqual({ inner: undefined })
    })

    test('should convert `null` to `undefined` for j.object.dbEntity', () => {
      interface Inner extends BaseDBEntity {
        foo: string
      }
      interface Outer {
        inner?: Inner
      }
      const schema = j.object<Outer>({
        inner: j.object.dbEntity<Inner>({ foo: j.string() }).optional(null),
      })
      const ajvSchema = AjvSchema.create(schema)

      const [err1, result1] = ajvSchema.getValidationResult({
        inner: { id: 'id', created: MOCK_TS_2018_06_21, updated: MOCK_TS_2018_06_21, foo: 'bar' },
      })
      expect(err1).toBeNull()
      expect(result1).toEqual({
        inner: { id: 'id', created: MOCK_TS_2018_06_21, updated: MOCK_TS_2018_06_21, foo: 'bar' },
      })

      const [err2, result2] = ajvSchema.getValidationResult({ inner: null } as any)
      expect(err2).toBeNull()
      expect(result2).toEqual({ inner: undefined })
    })

    test('should not allow chaining after `optional(null)` (compile-time error)', () => {
      const schema = j.object<{ foo: string }>({ foo: j.string() }).optional(null)
      // When `null` is passed to optional(), the return type is JsonSchemaTerminal,
      // which doesn't have object-specific methods like extend().
      // This prevents mistakes at compile time rather than failing at runtime.
      // @ts-expect-error - extend doesn't exist on JsonSchemaTerminal
      expect(() => schema.extend({})).toThrow(TypeError)
    })

    test('should throw when used on a standalone schema (and not in an object/array)', () => {
      const schema = j.object<{ foo: string }>({ foo: j.string() }).optional(null)
      const ajvSchema = AjvSchema.create(schema)

      // The check only triggers when the value is `null` (not when it's a valid object)
      expect(() => ajvSchema.isValid(null as any)).toThrowErrorMatchingInlineSnapshot(
        `[AssertionError: You should only use \`optional([x, y, z]) on a property of an object, or on an element of an array due to Ajv mutation issues.]`,
      )
    })

    test('should still be an optional field when passing in `null`', () => {
      interface Outer {
        inner?: { foo: string }
      }
      const schema = j.object<Outer>({
        inner: j.object<{ foo: string }>({ foo: j.string() }).optional(null),
      })
      const ajvSchema = AjvSchema.create(schema)

      const [err1, result1] = ajvSchema.getValidationResult({})
      expect(err1).toBeNull()
      expect(result1).toEqual({})
    })
  })

  describe('minProperties', () => {
    test('should accept a valid object', () => {
      const schema = j
        .object<{ foo?: string; bar?: string; shu?: string }>({
          foo: j.string().optional(),
          bar: j.string().optional(),
          shu: j.string().optional(),
        })
        .minProperties(2)
      const ajvSchema = AjvSchema.create(schema)

      const testCases = [
        { foo: 'foo', bar: 'bar', shu: 'shu' },
        { foo: 'foo', bar: 'bar' },
      ]
      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
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
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, _stringify(value)).not.toBeNull()
      })
    })
  })

  describe('maxProperties', () => {
    test('should accept a valid object', () => {
      const schema = j
        .object<{ foo?: string; bar?: string; shu?: string }>({
          foo: j.string().optional(),
          bar: j.string().optional(),
          shu: j.string().optional(),
        })
        .maxProperties(2)
      const ajvSchema = AjvSchema.create(schema)

      const testCases = [{ foo: 'foo' }, {}, { foo: 'foo', bar: 'bar' }]
      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, _stringify(value)).toBeNull()
      })

      const invalidCases: any[] = [{ foo: 'foo', bar: 'bar', shu: 'shu' }, 0, 'abcd', true, []]
      invalidCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, _stringify(value)).not.toBeNull()
      })
    })
  })

  describe('.exclusiveProperties', () => {
    test('should accept a valid object', () => {
      const schema = j
        .object<{ foo?: string; bar?: string; shu?: string }>({
          foo: j.string().optional(),
          bar: j.string().optional(),
          shu: j.string().optional(),
        })
        .exclusiveProperties(['foo', 'bar'])
      const ajvSchema = AjvSchema.create(schema)

      const testCases = [{}, { foo: 'foo' }, { bar: 'bar' }, { foo: 'foo', shu: 'shu' }]
      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, _stringify(value)).toBeNull()
      })

      const invalidCases: any[] = [{ foo: 'foo', bar: 'bar' }, 0, 'abcd', true, []]
      invalidCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, _stringify(value)).not.toBeNull()
      })
    })
  })

  describe('.record', () => {
    test('should correctly infer the type', () => {
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
      const ajvSchema = AjvSchema.create(schema)

      const validCases: any[] = [{}, { '123': 1, '2345': 2 }]
      for (const data of validCases) {
        const [err, result] = ajvSchema.getValidationResult(data)
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
        const [err] = ajvSchema.getValidationResult(data)
        expect(err, _stringify(data)).not.toBeNull()
      }

      const specialCases: any[] = [
        { '123': 1, '2345': 2, '1': 3 }, // non matching keys are stripped
        { '123': 1, '2345': 2, a: 3 }, // non matching keys are stripped
      ]
      for (const data of specialCases) {
        const [err, result] = ajvSchema.getValidationResult(data)
        expect(result).toEqual({ '123': 1, '2345': 2 })
        expect(err, _stringify(data)).toBeNull()
      }
    })
  })

  describe('.withEnumKeys', () => {
    test('should work with a list of const values', () => {
      const schema = j.object
        .withEnumKeys(['a', 'b', 1], j.number().optional())
        .isOfType<Partial<Record<'a' | 'b' | '1', number>>>()
      const ajvSchema = AjvSchema.create(schema)

      const validCases: any[] = [{}, { a: 1 }, { a: 1, b: 2 }, { a: 1, b: 2, '1': 3 }]
      for (const data of validCases) {
        const [err, result] = ajvSchema.getValidationResult(data)
        expect(err, _stringify(data)).toBeNull()
        expect(result, _stringify(data)).toEqual(data)
      }

      const invalidCases: any[] = ['a', 1, true, [], { a: '1' }]
      for (const data of invalidCases) {
        const [err] = ajvSchema.getValidationResult(data)
        expect(err, _stringify(data)).not.toBeNull()
      }

      const specialCases: any[] = [{ c: 3 }]
      for (const data of specialCases) {
        const [err, result] = ajvSchema.getValidationResult(data)
        expect(result).toEqual({}) // The key is thought of as an additional key which is stripped
        expect(err, _stringify(data)).toBeNull()
      }
    })

    test('should work with NumberEnum', () => {
      enum E {
        A = 1,
        B = 2,
      }
      const schema = j.object
        .withEnumKeys(E, j.number().optional())
        .isOfType<Partial<Record<E, number | undefined>>>()
      const ajvSchema = AjvSchema.create(schema)

      const validCases: any[] = [{}, { '1': 1 }, { '1': 1, '2': 2 }]
      for (const data of validCases) {
        const [err, result] = ajvSchema.getValidationResult(data)
        expect(err, _stringify(data)).toBeNull()
        expect(result, _stringify(data)).toEqual(data)
      }

      const invalidCases: any[] = ['a', 1, true, [], { '1': 'one' }]
      for (const data of invalidCases) {
        const [err] = ajvSchema.getValidationResult(data)
        expect(err, _stringify(data)).not.toBeNull()
      }

      const specialCases: any[] = [{ '3': 3 }]
      for (const data of specialCases) {
        const [err, result] = ajvSchema.getValidationResult(data)
        expect(result).toEqual({}) // The key is thought of as an additional key which is stripped
        expect(err, _stringify(data)).toBeNull()
      }
    })

    test('should work with StringEnum', () => {
      enum E {
        A = 'a',
        B = 'b',
      }
      const schema = j.object
        .withEnumKeys(E, j.number().optional())
        .isOfType<Record<E, number | undefined>>()
      const ajvSchema = AjvSchema.create(schema)

      const validCases: any[] = [{}, { a: 1 }, { a: 1, b: 2 }, { a: 1, b: 2 }]
      for (const data of validCases) {
        const [err, result] = ajvSchema.getValidationResult(data)
        expect(err, _stringify(data)).toBeNull()
        expect(result, _stringify(data)).toEqual(data)
      }

      const invalidCases: any[] = ['a', 1, true, [], { a: '1' }]
      for (const data of invalidCases) {
        const [err] = ajvSchema.getValidationResult(data)
        expect(err, _stringify(data)).not.toBeNull()
      }

      const specialCases: any[] = [{ c: 3 }]
      for (const data of specialCases) {
        const [err, result] = ajvSchema.getValidationResult(data)
        expect(result).toEqual({}) // The key is thought of as an additional key which is stripped
        expect(err, _stringify(data)).toBeNull()
      }
    })

    test('should require all keys when the schema is non-optional', () => {
      enum E {
        A = 'a',
        B = 'b',
      }

      const schema = j.object.withEnumKeys(E, j.number()).isOfType<Record<E, number>>()
      const ajvSchema = AjvSchema.create(schema)

      const validCases = [{ a: 1, b: 2 }]
      for (const data of validCases) {
        const [err, result] = ajvSchema.getValidationResult(data)
        expect(err, _stringify(data)).toBeNull()
        expect(result, _stringify(data)).toEqual(data)
      }

      const invalidCases = [{}, { a: 1 }, { b: 2 }]
      for (const data of invalidCases) {
        const [err] = ajvSchema.getValidationResult(data as any)
        expect(err, _stringify(data)).not.toBeNull()
      }
    })

    test('should accept partial objects when the schema is optional', () => {
      enum E {
        A = 'a',
        B = 'b',
      }

      const schema = j.object
        .withEnumKeys(E, j.number().optional())
        .isOfType<Partial<Record<E, number>>>()
      const ajvSchema = AjvSchema.create(schema)

      const validCases = [{}, { a: 1 }, { b: 2 }, { a: 1, b: 2 }]
      for (const data of validCases) {
        const [err, result] = ajvSchema.getValidationResult(data)
        expect(err, _stringify(data)).toBeNull()
        expect(result, _stringify(data)).toEqual(data)
      }
    })

    test('should throw without `.isOfType` check', () => {
      const schema = j.object.withEnumKeys(['a', 'b', 1], j.number().optional())

      const fn = () => AjvSchema.create(schema)

      expect(fn).toThrow(
        'The schema must be type checked against a type or interface, using the `.isOfType()` helper in `j`.',
      )
    })

    describe('minProperties', () => {
      test('should work for withEnumKeys as well', () => {
        enum E {
          A = 'a',
          B = 'b',
        }
        const schema = j.object
          .withEnumKeys(E, j.number().optional())
          .minProperties(1)
          .isOfType<Record<E, number | undefined>>()
        const ajvSchema = AjvSchema.create(schema)

        const validCases: any[] = [{ a: 1 }, { a: 1, b: 2 }]
        for (const data of validCases) {
          const [err, result] = ajvSchema.getValidationResult(data)
          expect(err, _stringify(data)).toBeNull()
          expect(result, _stringify(data)).toEqual(data)
        }

        const invalidCases: any[] = [{}, { a: '1' }, { c: 1 }]
        for (const data of invalidCases) {
          const [err] = ajvSchema.getValidationResult(data)
          expect(err, _stringify(data)).not.toBeNull()
        }
      })
    })
  })

  describe('.stringMap', () => {
    test('should work', () => {
      const schema = j.object.stringMap(j.number().nullable()).isOfType<StringMap<number | null>>()
      const ajvSchema = AjvSchema.create(schema)

      const validCases: any[] = [{}, { a: 1 }, { a: 1, b: 2 }]
      for (const data of validCases) {
        const [err, result] = ajvSchema.getValidationResult(data)
        expect(err, _stringify(data)).toBeNull()
        expect(result, _stringify(data)).toEqual(data)
      }

      const invalidCases: any[] = ['a', 1, true, [], { a: '1' }, { a: 1, b: undefined }]
      for (const data of invalidCases) {
        const [err] = ajvSchema.getValidationResult(data)
        expect(err, _stringify(data)).not.toBeNull()
      }
    })

    test('should throw without `.isOfType` check', () => {
      const schema = j.object.stringMap(j.number())

      const fn = () => AjvSchema.create(schema)

      expect(fn).toThrow(
        'The schema must be type checked against a type or interface, using the `.isOfType()` helper in `j`.',
      )
    })
  })
})

describe('enum', () => {
  test('should work correctly with type inference', () => {
    const schema = j.enum([0, 'foo', false])

    const [err, result] = AjvSchema.create(schema).getValidationResult(0)

    expect(err).toBeNull()
    expect(result).toBe(0)
    expectTypeOf(result).toEqualTypeOf<0 | 'foo' | false>()
  })

  test('should accept a valid value', () => {
    const testCases = [0, 'foo', false] as const
    const schema = j.enum([0, 'foo', false])
    const ajvSchema = AjvSchema.create(schema)

    testCases.forEach(value => {
      const [err] = ajvSchema.getValidationResult(value)
      expect(err, String(value)).toBeNull()
    })
  })

  test('should reject an invalid value', () => {
    const invalidCases: any[] = [1, 'abc', true, [], {}]
    const schema = j.enum([0, 'foo', false])
    const ajvSchema = AjvSchema.create(schema)

    invalidCases.forEach(value => {
      const [err] = ajvSchema.getValidationResult(value)
      expect(err, String(value)).not.toBeNull()
    })
  })

  test('should support typescript string enums', () => {
    enum OompaLoompa {
      Foo = 'foo',
      Bar = 'bar',
    }
    const schema = j.enum(OompaLoompa)
    const [err, result] = AjvSchema.create(schema).getValidationResult(OompaLoompa.Bar)

    expect(err).toBeNull()
    expect(result).toBe(OompaLoompa.Bar)
    expectTypeOf(result).toEqualTypeOf<OompaLoompa>()
  })

  test('should support typescript numeric enums', () => {
    enum OompaLoompa {
      Foo = 0,
      Bar = 1,
    }
    const schema = j.enum(OompaLoompa)
    const [err, result] = AjvSchema.create(schema).getValidationResult(OompaLoompa.Bar)

    expect(err).toBeNull()
    expect(result).toBe(OompaLoompa.Bar)
    expectTypeOf(result).toEqualTypeOf<OompaLoompa>()
  })
})

describe('buffer', () => {
  test('should work correctly with type inference', () => {
    const schema = j.buffer()

    const [err, result] = AjvSchema.create(schema).getValidationResult(Buffer.from('asdf'))

    expect(err).toBeNull()
    expect(result).toBeInstanceOf(Buffer)
    expect(result).toEqual(Buffer.from('asdf'))
    expectTypeOf(result).toEqualTypeOf<Buffer>()
  })

  test('should accept valid data', () => {
    const testCases: any[] = ['foobar', [0, 1, 2]]

    const schema = j.buffer()
    const ajvSchema = AjvSchema.create(schema)

    testCases.forEach(input => {
      const [err] = ajvSchema.getValidationResult(Buffer.from(input))
      expect(err, String(input)).toBeNull()
    })
  })

  test('should reject invalid data', () => {
    const invalidTestCases: any[] = [
      // Invalid input for Buffer
      null,
      0,
      ['foo', 'bar'],
    ]
    const schema = j.buffer()
    const ajvSchema = AjvSchema.create(schema)

    invalidTestCases.forEach(input => {
      const [err] = ajvSchema.getValidationResult(input)
      expect(err, String(input)).not.toBeNull()
    })
  })

  test('should NOT accept an Array - when it is a standalone schema', () => {
    const schema = j.buffer()

    const [err] = AjvSchema.create(schema).getValidationResult(['foo', 'bar'])

    expect(err).toMatchInlineSnapshot(`
      [AjvValidationError: Object can only transform data into a Buffer when the schema is in an object or an array schema. This is an Ajv limitation.
      Input: [ 'foo', 'bar' ]]
    `)
  })

  test('should accept an Array and produce a Buffer - when it is a property of an object', () => {
    const schema = j.object.infer({ buffer: j.buffer() }).isOfType<{ buffer: Buffer }>()

    const [err, result] = AjvSchema.create(schema).getValidationResult({ buffer: 'foobar' })

    expect(err).toBeNull()
    expect(result.buffer).toBeInstanceOf(Buffer)
    expect(result.buffer).toEqual(Buffer.from('foobar'))
    expectTypeOf(result).toEqualTypeOf<{ buffer: Buffer }>()
  })

  test('should automagically make an Array unique', () => {
    const schema = j.object.infer({ set: j.set(j.string()) }).isOfType<{ set: Set2<string> }>()

    const [err, result] = AjvSchema.create(schema).getValidationResult({
      set: ['foo', 'bar', 'foo'],
    })

    expect(err).toBeNull()
    expect(result.set.toArray()).toEqual(['foo', 'bar'])
  })
})

describe('oneOf', () => {
  test('should correctly infer the type', () => {
    const schema = j.oneOf([j.string().nullable(), j.number()])
    const [, result] = AjvSchema.create(schema).getValidationResult({} as any)
    expectTypeOf(result).toEqualTypeOf<string | number | null>()
  })

  test('should accept valid values', () => {
    const testCases = ['a', 1, null]
    const schema = j.oneOf([j.string().nullable(), j.number()])

    testCases.forEach(value => {
      const [err] = AjvSchema.create(schema).getValidationResult(value)
      expect(err).toBeNull()
    })
  })

  test('should reject invalid values', () => {
    const invalidCases: any[] = [undefined, true, [], {}]
    const schema = j.oneOf([j.string().nullable(), j.number()])

    invalidCases.forEach(value => {
      const [err] = AjvSchema.create(schema).getValidationResult(value)
      expect(err).not.toBeNull()
    })
  })

  test('should reject values matching multiple schemas', () => {
    // Both schemas accept strings of length 5-10
    const schema = j.oneOf([j.string().minLength(5), j.string().maxLength(10)])

    // 'hello' matches both schemas, so oneOf rejects it
    const [err] = AjvSchema.create(schema).getValidationResult('hello')
    expect(err).not.toBeNull()
  })

  test('should work with complex values', () => {
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
})

describe('anyOf', () => {
  test('should correctly infer the type', () => {
    const schema = j.anyOf([j.string().nullable(), j.number()])
    const [, result] = AjvSchema.create(schema).getValidationResult({} as any)
    expectTypeOf(result).toEqualTypeOf<string | number | null>()
  })

  test('should accept valid values', () => {
    const testCases = ['a', 1, null]
    const schema = j.anyOf([j.string().nullable(), j.number()])

    testCases.forEach(value => {
      const [err] = AjvSchema.create(schema).getValidationResult(value)
      expect(err).toBeNull()
    })
  })

  test('should reject invalid values', () => {
    const invalidCases: any[] = [undefined, true, [], {}]
    const schema = j.anyOf([j.string().nullable(), j.number()])

    invalidCases.forEach(value => {
      const [err] = AjvSchema.create(schema).getValidationResult(value)
      expect(err).not.toBeNull()
    })
  })

  test('should accept values matching multiple schemas', () => {
    // Both schemas accept strings of length 5-10
    const schema = j.anyOf([j.string().minLength(5), j.string().maxLength(10)])

    // 'hello' matches both schemas, anyOf accepts it (unlike oneOf)
    const [err] = AjvSchema.create(schema).getValidationResult('hello')
    expect(err).toBeNull()
  })

  test('should not work with complex values', () => {
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

  test('should correctly infer the type', () => {
    const ajvSchema = AjvSchema.create(schema)
    const [, result] = ajvSchema.getValidationResult({ type: Foo.A, foo: 'asdf' })

    expectTypeOf(result).toEqualTypeOf<FooA | FooB | FooC>()
  })

  test('should accept valid values', () => {
    const ajvSchema = AjvSchema.create(schema)

    const testCases = [
      { type: Foo.A, foo: 'asdf' },
      { type: Foo.B, bar: 1 },
      { type: Foo.C, foo: true },
    ]
    testCases.forEach(value => {
      const [err, result] = ajvSchema.getValidationResult(value)
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
      const [err] = ajvSchema.getValidationResult(value)
      expect(err).not.toBeNull()
    })
  })
})

describe('anyOfThese', () => {
  test('should correctly infer the type', () => {
    const schema = j.anyOfThese([j.string().nullable(), j.number()])
    const [, result] = AjvSchema.create(schema).getValidationResult({} as any)
    expectTypeOf(result).toEqualTypeOf<string | number | null>()
  })

  test('should accept valid values', () => {
    const schema = j.anyOfThese([j.string().nullable(), j.number()])
    const ajvSchema = AjvSchema.create(schema)

    const testCases = ['a', 1, null]
    testCases.forEach(value => {
      const [err] = ajvSchema.getValidationResult(value)
      expect(err).toBeNull()
    })

    const invalidCases: any[] = [undefined, true, [], {}]
    invalidCases.forEach(value => {
      const [err] = ajvSchema.getValidationResult(value)
      expect(err).not.toBeNull()
    })
  })

  test('should accept values matching multiple schemas', () => {
    // Both schemas accept strings of length 5-10
    const schema = j.anyOfThese([j.string().minLength(5), j.string().maxLength(10)])

    // 'hello' matches both schemas, anyOfThese accepts it (unlike oneOf)
    const [err] = AjvSchema.create(schema).getValidationResult('hello')
    expect(err).toBeNull()
  })

  test('should work with complex values', () => {
    const schema1 = j.object<{ data: { foo: string; bar: number } }>({
      data: j.object.infer({ foo: j.string(), bar: j.number() }),
    })
    const schema2 = j.object<{ data: { foo: string; shu: number } }>({
      data: j.object.infer({ foo: j.string(), shu: j.number() }),
    })
    const schema = j.anyOfThese([schema1, schema2])
    const ajvSchema = AjvSchema.create(schema)

    const testCases = [{ data: { foo: 'foo', bar: 1 } }, { data: { foo: 'foo', shu: 1 } }]
    testCases.forEach(value => {
      const [err] = ajvSchema.getValidationResult(value)
      expect(err).toBeNull()
    })

    const invalidCases: any[] = [undefined, true, [], {}, { data: { foo: 'foo' } }]
    invalidCases.forEach(value => {
      const [err] = ajvSchema.getValidationResult(value)
      expect(err).not.toBeNull()
    })

    const [err] = ajvSchema.getValidationResult({} as any)
    expect(err).toMatchInlineSnapshot(`
      [AjvValidationError: Object could not find a suitable schema to validate against
      Input: {}]
    `)
  })

  test('should work with nested schemas', () => {
    const schema = j.object<{ data: { foo: string } | { bar: number } }>({
      data: j.anyOfThese([
        j.object.infer({ foo: j.string() }),
        j.object.infer({ bar: j.number() }),
      ]),
    })
    const ajvSchema = AjvSchema.create(schema)

    const testCases = [{ data: { foo: 'foo' } }, { data: { bar: 1 } }]
    testCases.forEach(value => {
      const [err] = ajvSchema.getValidationResult(value)
      expect(err).toBeNull()
    })

    const invalidCases: any[] = [undefined, true, [], {}, { data: { shu: 'foo' } }]
    invalidCases.forEach(value => {
      const [err] = ajvSchema.getValidationResult(value)
      expect(err).not.toBeNull()
    })
  })
})

describe('errors', () => {
  test('should properly display the path to the erronous value', () => {
    const schema = j.object.infer({ foo: j.array(j.string()) }).isOfType<{ foo: string[] }>()

    const [err] = AjvSchema.create(schema).getValidationResult({
      foo: ['a', 'b', 'c', 1, 'e'],
    } as any)

    expect(err).toMatchInlineSnapshot(`
      [AjvValidationError: Object.foo[3] must be string
      Input: { foo: [ 'a', 'b', 'c', 1, 'e' ] }]
    `)
  })
})

describe('castAs', () => {
  test('should correctly infer the new type', () => {
    const schema = j.object
      .infer({ foo: j.string() })
      .castAs<{ bar: number }>()
      .isOfType<{ bar: number }>()

    const [err, result] = AjvSchema.create(schema).getValidationResult({ foo: 'hello' } as any)

    expect(err).toBeNull()
    expect(result).toEqual({ foo: 'hello' })
    expectTypeOf(result).toEqualTypeOf<{ bar: number }>()
  })
})

describe('default', () => {
  test('should use the default when the property is missing', () => {
    const schema = j.object<{ foo: string; bar: number; shu: boolean }>({
      foo: j.string().default('foo'),
      bar: j.number().default(123),
      shu: j.boolean().default(true),
    })
    const ajvSchema = AjvSchema.create(schema)

    const [err1, result1] = ajvSchema.getValidationResult({ foo: 'good', bar: 1, shu: false })
    expect(err1).toBeNull()
    expect(result1).toEqual({ foo: 'good', bar: 1, shu: false })

    const [err2, result2] = ajvSchema.getValidationResult({ bar: 1, shu: false } as any)
    expect(err2).toBeNull()
    expect(result2).toEqual({ foo: 'foo', bar: 1, shu: false })

    const [err3, result3] = ajvSchema.getValidationResult({ foo: 'good', shu: false } as any)
    expect(err3).toBeNull()
    expect(result3).toEqual({ foo: 'good', bar: 123, shu: false })

    const [err4, result4] = ajvSchema.getValidationResult({ foo: 'good', bar: 1 } as any)
    expect(err4).toBeNull()
    expect(result4).toEqual({ foo: 'good', bar: 1, shu: true })
  })
})

describe('final', () => {
  test('locks the given schema', async () => {
    const schema = j.string().minLength(2).maxLength(3).final()
    const ajvSchema = AjvSchema.create(schema)

    const [err1] = ajvSchema.getValidationResult('abc')
    expect(err1).toBeNull()

    const [err2] = ajvSchema.getValidationResult('abcd')
    expect(err2).not.toBeNull()

    // @ts-expect-error
    expect(() => schema.optional()).toThrow('schema.optional is not a function')
    // @ts-expect-error
    expect(() => schema.nullable()).toThrow('schema.nullable is not a function')
  })
})

describe('literal', () => {
  test('should accept a valid value', () => {
    const schema1 = j.literal('magic')
    const ajvSchema1 = AjvSchema.create(schema1)
    const [, result1] = ajvSchema1.getValidationResult('magic')
    expectTypeOf(result1).toEqualTypeOf<'magic'>()
    expect(result1).toBe('magic')

    const schema2 = j.literal(5)
    const ajvSchema2 = AjvSchema.create(schema2)
    const [, result2] = ajvSchema2.getValidationResult(5)
    expectTypeOf(result2).toEqualTypeOf<5>()
    expect(result2).toBe(5)

    const schema3 = j.literal(true)
    const ajvSchema3 = AjvSchema.create(schema3)
    const [, result3] = ajvSchema3.getValidationResult(true)
    expectTypeOf(result3).toEqualTypeOf<true>()
    expect(result3).toBe(true)

    const schema4 = j.literal(null)
    const ajvSchema4 = AjvSchema.create(schema4)
    const [, result4] = ajvSchema4.getValidationResult(null)
    expectTypeOf(result4).toEqualTypeOf<null>()
    expect(result4).toBeNull()

    enum Foo {
      A = 1,
      B = 2,
    }
    const schema5 = j.literal(Foo.A)
    const ajvSchema5 = AjvSchema.create(schema5)
    const [, result5] = ajvSchema5.getValidationResult(Foo.A)
    expectTypeOf(result5).toEqualTypeOf<Foo.A>()
    expect(result5).toBe(Foo.A)

    const [err1] = ajvSchema1.getValidationResult('mushroom' as any)
    expect(err1).toMatchInlineSnapshot(`
      [AjvValidationError: Object must be equal to one of the allowed values
      Input: mushroom]
    `)

    const [err2] = ajvSchema2.getValidationResult(3 as any)
    expect(err2).toMatchInlineSnapshot(`
      [AjvValidationError: Object must be equal to one of the allowed values
      Input: 3]
    `)

    const [err3] = ajvSchema3.getValidationResult(false as any)
    expect(err3).toMatchInlineSnapshot(`
      [AjvValidationError: Object must be equal to one of the allowed values
      Input: false]
    `)

    const [err4] = ajvSchema4.getValidationResult({} as any)
    expect(err4).toMatchInlineSnapshot(`
      [AjvValidationError: Object must be equal to one of the allowed values
      Input: {}]
    `)
  })
})
