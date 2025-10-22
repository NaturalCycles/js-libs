/* eslint-disable vitest/valid-expect */
/* eslint-disable id-denylist */
// oxlint-disable no-unused-expressions

import { localDate, localTime } from '@naturalcycles/js-lib/datetime'
import { Set2 } from '@naturalcycles/js-lib/object'
import type {
  Branded,
  IsoDate,
  IsoDateTime,
  UnixTimestamp,
  UnixTimestampMillis,
} from '@naturalcycles/js-lib/types'
import { describe, expect, test } from 'vitest'
import { AjvSchema } from './ajvSchema.js'
import { j } from './jsonSchemaBuilder.js'

describe('string', () => {
  test('should work correctly with type inference', () => {
    const schema = j.string()

    const [err, result] = AjvSchema.create(schema).getValidationResult('foo')

    expect(err).toBeNull()
    expect(result).toBe('foo')
    result satisfies string
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
  })

  describe('min', () => {
    test('should correctly validate the minimum length of the string', () => {
      const schema = j.string().min(5)

      const [err01] = AjvSchema.create(schema).getValidationResult('01234')
      expect(err01).toBeNull()
      const [err02] = AjvSchema.create(schema).getValidationResult('012345')
      expect(err02).toBeNull()

      const [err11] = AjvSchema.create(schema).getValidationResult('0123')
      expect(err11).not.toBeNull()
    })
  })

  describe('max', () => {
    test('should correctly validate the maximum length of the string', () => {
      const schema = j.string().max(5)

      const [err01] = AjvSchema.create(schema).getValidationResult('0123')
      expect(err01).toBeNull()
      const [err02] = AjvSchema.create(schema).getValidationResult('01234')
      expect(err02).toBeNull()

      const [err11] = AjvSchema.create(schema).getValidationResult('012345')
      expect(err11).not.toBeNull()
    })
  })

  describe('length', () => {
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

  describe('trim', () => {
    test('should trim the input string - when inside an object schema', () => {
      const schema = j.object({ trim: j.string().trim() }).isOfType<{ trim: string }>()

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
      const schema = j
        .object({ toLowerCase: j.string().toLowerCase() })
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
      const schema = j
        .object({ toUpperCase: j.string().toUpperCase() })
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
      const schema = j.object({ truncate: j.string().truncate(5) }).isOfType<{ truncate: string }>()

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
      const schema = j
        .object({ truncate: j.string().trim().truncate(5) })
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

      const [err, result] = AjvSchema.create(schema).getValidationResult('AccountId') // no type-cast needed

      expect(err).toBeNull()
      expect(result).toBe('AccountId')
      result satisfies AccountId
    })
  })

  describe('email', () => {
    test('should accept valid email address - %s', () => {
      const testCases: string[] = ['david@nc.se', 'paul-louis@nc.co.uk']
      const schema = j.string().email()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(email => {
        const [err] = ajvSchema.getValidationResult(email)
        expect(err).toBeNull()
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

    test('should convert the email to lowercase - when inside an object schema', () => {
      const schema = j.object({ email: j.string().email() }).isOfType<{ email: string }>()

      const [, result] = AjvSchema.create(schema).getValidationResult({ email: 'LOWERCASE@nc.COM' })

      expect(result.email).toBe('lowercase@nc.com')
    })

    test('should trim the email - when inside an object schema', () => {
      const schema = j.object({ email: j.string().email() }).isOfType<{ email: string }>()

      const [, result] = AjvSchema.create(schema).getValidationResult({
        email: '  trimmed@nc.com  ',
      })

      expect(result.email).toBe('trimmed@nc.com')
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
      result satisfies IsoDate
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
      const invalidCases = [
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
      ]
      const schema = j.string().isoDate()
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(date => {
        const [err] = ajvSchema.getValidationResult(date)
        expect(err, String(date)).not.toBeNull()
      })
    })
  })

  describe('IsoDateTime', () => {
    test('should work correctly with type inference', () => {
      const schema = j.string().isoDateTime()

      const [err, result] = AjvSchema.create(schema).getValidationResult('2025-10-15T01:01:01Z')

      expect(err).toBeNull()
      expect(result).toBe('2025-10-15T01:01:01Z')
      result satisfies IsoDateTime
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
        '2001:0db8:0000:0000:0000:ff00:0042:8329',
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

  describe('id', () => {
    test('should accept string with valid ID', () => {
      const testCases = ['alphanumericwith0123_', '012345']
      const schema = j.string().id()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(id => {
        const [err] = ajvSchema.getValidationResult(id)
        expect(err, String(id)).toBeNull()
      })
    })

    test('should reject string with invalid ID', () => {
      const invalidCases: any[] = [
        '', // empty
        '01234', // too short
        'x'.repeat(65), // too long
        'nodash-dash', // `-`
        'NoCapitalLetters', // capital letter
        0,
        true,
        [],
        {},
      ]
      const schema = j.string().id()
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(id => {
        const [err] = ajvSchema.getValidationResult(id)
        expect(err, String(id)).not.toBeNull()
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
})

describe('number', () => {
  test('should work correctly with type inference', () => {
    const schema = j.number()

    const [err, result] = AjvSchema.create(schema).getValidationResult(0)

    expect(err).toBeNull()
    expect(result).toBe(0)
    result satisfies number
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

  describe('range', () => {
    test('should accept a number with a valid value', () => {
      const testCases = [2, 2.5, 3]
      const schema = j.number().range(2, 3)
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).toBeNull()
      })
    })

    test('should reject a number with an invalid value', () => {
      const invalidCases = [1, 1.999, 3.001, 4]
      const schema = j.number().range(2, 3)
      const ajvSchema = AjvSchema.create(schema)

      invalidCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
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
      const [, result] = ajvSchema.getValidationResult(0)
      result satisfies UnixTimestamp
    })

    test('should accept a number with a valid value', () => {
      const testCases = [0, localTime('2500-01-01T00:00:00Z' as IsoDateTime).unix]
      const schema = j.number().unixTimestamp()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
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
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('unixTimestamp2000', () => {
    test('should brand the value', () => {
      const schema = j.number().unixTimestamp2000()
      const ajvSchema = AjvSchema.create(schema)
      const [, result] = ajvSchema.getValidationResult(0)
      result satisfies UnixTimestamp
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
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('unixTimestampMillis', () => {
    test('should brand the value', () => {
      const schema = j.number().unixTimestampMillis()
      const ajvSchema = AjvSchema.create(schema)
      const [, result] = ajvSchema.getValidationResult(0)
      result satisfies UnixTimestampMillis
    })

    test('should accept a number with a valid value', () => {
      const testCases = [0, localTime('2500-01-01T00:00:00Z' as IsoDateTime).unixMillis]
      const schema = j.number().unixTimestampMillis()
      const ajvSchema = AjvSchema.create(schema)

      testCases.forEach(value => {
        const [err] = ajvSchema.getValidationResult(value)
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
        const [err] = ajvSchema.getValidationResult(value)
        expect(err, String(value)).not.toBeNull()
      })
    })
  })

  describe('unixTimestamp2000Millis', () => {
    test('should brand the value', () => {
      const schema = j.number().unixTimestamp2000Millis()
      const ajvSchema = AjvSchema.create(schema)
      const [, result] = ajvSchema.getValidationResult(0)
      result satisfies UnixTimestampMillis
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
        const [err] = ajvSchema.getValidationResult(value)
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

describe('array', () => {
  test('should work correctly with type inference', () => {
    const schema = j.array(j.string().nullable())

    const [err, result] = AjvSchema.create(schema).getValidationResult(['foo', null])

    expect(err).toBeNull()
    expect(result).toEqual(['foo', null])
    result satisfies (string | null)[]
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
})

describe('set', () => {
  test('should work correctly with type inference', () => {
    const schema = j.set(j.string())

    const [err, result] = AjvSchema.create(schema).getValidationResult(new Set2(['foo', 'bar']))

    expect(err).toBeNull()
    expect(result).toBeInstanceOf(Set2)
    expect(result.toArray()).toEqual(['foo', 'bar'])
    result satisfies Set2
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
    const schema = j.object({ set: j.set(j.string()) }).isOfType<{ set: Set2<string> }>()

    const [err, result] = AjvSchema.create(schema).getValidationResult({ set: ['foo', 'bar'] })

    expect(err).toBeNull()
    expect(result.set).toBeInstanceOf(Set2)
    expect(result.set.toArray()).toEqual(['foo', 'bar'])
    result satisfies { set: Set2<string> }
  })

  test('should automagically make an Array unique', () => {
    const schema = j.object({ set: j.set(j.string()) }).isOfType<{ set: Set2<string> }>()

    const [err, result] = AjvSchema.create(schema).getValidationResult({
      set: ['foo', 'bar', 'foo'],
    })

    expect(err).toBeNull()
    expect(result.set.toArray()).toEqual(['foo', 'bar'])
  })
})

describe('object', () => {
  test('should work correctly with type inference', () => {
    const schema = j
      .object({
        string: j.string(),
        stringOptional: j.string().optional(),
        array: j.array(j.string().nullable()),
        arrayOptional: j.array(j.string()).optional(),
        nested: j.object({
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
    result satisfies {
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
  })

  test('should work correctly with type assignment', () => {
    interface Foo {
      string: string
      stringOptional?: string
    }

    const schema = j
      .object({
        string: j.string(),
        stringOptional: j.string().optional(),
      })
      .isOfType<Foo>()

    const [, result] = AjvSchema.create(schema).getValidationResult({} as any)

    result satisfies Foo
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
})

describe('errors', () => {
  test('should properly display the path to the erronous value', () => {
    const schema = j.object({ foo: j.array(j.string()) }).isOfType<{ foo: string[] }>()

    const [err] = AjvSchema.create(schema).getValidationResult({
      foo: ['a', 'b', 'c', 1, 'e'],
    } as any)

    expect(err).toMatchInlineSnapshot(`
      [AjvValidationError: Object.foo[3] must be string
      Input: { foo: [ 'a', 'b', 'c', 1, 'e' ] }]
    `)
  })
})
