import { localTime } from '@naturalcycles/js-lib/datetime/localTime.js'
import type { BaseDBEntity, IsoDateTime } from '@naturalcycles/js-lib/types'
import { describe, expect, expectTypeOf, test } from 'vitest'
import { testValidation } from '../../test/validation.test.util.js'
import {
  baseDBEntitySchema,
  binarySchema,
  dateIntervalStringSchema,
  dateObjectSchema,
  dateTimeStringSchema,
  emailSchema,
  ianaTimezoneSchema,
  idSchema,
  macAddressSchema,
  numberEnumKeySchema,
  numberEnumValueSchema,
  numberSchema,
  numberSchemaTyped,
  objectSchema,
  oneOfSchema,
  semVerSchema,
  stringEnumKeySchema,
  stringEnumValueSchema,
  stringSchema,
  stringSchemaTyped,
  urlSchema,
  uuidSchema,
} from './joi.shared.schemas.js'
import { JoiValidationError } from './joi.validation.error.js'
import { isValid, validate } from './joi.validation.util.js'

test('semVerSchema', () => {
  testValidation(
    semVerSchema,
    ['1.0.0', '1.5.3', '2.9.4', '3.0.14', '0.0.14'],
    [undefined, null, '', 3, '1.', '1.5.', '1.5.x', '1.5.e', '1', '1.5', '1.5.3.2'],
  )
})

test('urlSchema', () => {
  const schema = urlSchema()
  const schemaAllowHttp = urlSchema(['https', 'http'])

  expect(() => validate('abc', schema)).toThrow(JoiValidationError)

  validate('https://example.com', schema)
  expect(() => validate('http://example.com', schema)).toThrow(JoiValidationError)

  validate('https://example.com', schemaAllowHttp)
  validate('http://example.com', schemaAllowHttp)
})

test('emailSchema should do TLD validation by default', () => {
  expect(isValid('#$%', emailSchema)).toBe(false)
  expect(isValid('test@gmail.com', emailSchema)).toBe(true)
  expect(isValid('test@gmail.con', emailSchema)).toBe(false)
})

test('possibility to disable TLD email validation', () => {
  const schema = stringSchema.email({ tlds: false }).lowercase()
  expect(isValid('#$%', schema)).toBe(false)
  expect(isValid('test@gmail.com', schema)).toBe(true)
  expect(isValid('test@gmail.con', schema)).toBe(true)
})

test('emailSchema should lowercase', () => {
  expect(validate('test@GMAIL.cOm', emailSchema)).toBe('test@gmail.com')
})

test('oneOfSchema', () => {
  const s = oneOfSchema(stringSchema, binarySchema)

  // Should pass
  validate('abc', s)
  validate('', s)
  validate(Buffer.from('abc'), s)

  expect(isValid(5, s)).toBe(false)
  expect(isValid(['s'], s)).toBe(false)
})

test.each(['123456', '123456a', '123456aB', '123456aB_', `a`.repeat(30), `a`.repeat(64)])(
  'valid idSchema: %s',
  s => {
    validate(s, idSchema)
  },
)

test.each([
  '1',
  '12',
  45,
  '12345',
  '12345-',
  '12345%',
  '12345$',
  '12345&',
  '12345^',
  '12345@',
  `a`.repeat(65),
  `a`.repeat(129),
])('invalid idSchema: %s', s => {
  expect(isValid(s, idSchema)).toBe(false)
})

test('other schemas', () => {
  validate(new Date(), dateObjectSchema)
  expect(isValid('2022-01-01', dateObjectSchema)).toBe(false)
})

interface Obj extends BaseDBEntity {
  v: number
}

const _objSchema = objectSchema<Obj>({
  v: numberSchema,
}).concat(baseDBEntitySchema as any)

enum OS {
  IOS = 'IOS',
  ANDROID = 'ANDROID',
}

enum AppId {
  APP1 = 1,
  APP2 = 2,
}

test('enum schemas', () => {
  let os = validate(OS.IOS, stringSchemaTyped<OS>())
  expectTypeOf(os).toEqualTypeOf<OS>()

  os = validate(OS.IOS, stringEnumValueSchema(OS))
  expectTypeOf(os).toEqualTypeOf<OS>()

  expect(isValid(OS.IOS, stringEnumValueSchema(OS))).toBe(true)
  expect(isValid('bad' as OS, stringEnumValueSchema(OS))).toBe(false)

  const osKey = validate(OS.IOS, stringEnumKeySchema(OS))
  expectTypeOf(osKey).toEqualTypeOf<string>()

  let appId = validate(AppId.APP1, numberSchemaTyped<AppId>())
  expectTypeOf(appId).toEqualTypeOf<AppId>()

  appId = validate(AppId.APP1, numberEnumValueSchema(AppId))
  expectTypeOf(appId).toEqualTypeOf<AppId>()

  const appIdKey = validate(AppId[AppId.APP1], numberEnumKeySchema(AppId))
  expectTypeOf(appIdKey).toEqualTypeOf<string>()
})

test('dateIntervalSchema', () => {
  const schema = dateIntervalStringSchema

  validate('2022-01-01/2022-01-02', schema)
  expect(() => validate(undefined, schema)).toThrowErrorMatchingInlineSnapshot(
    `[JoiValidationError: "value" is required]`,
  )
  expect(() => validate('2022-01-01', schema)).toThrowErrorMatchingInlineSnapshot(
    `[JoiValidationError: must be a DateInterval string]`,
  )
  expect(() => validate('2022-01-01/2022-01-0', schema)).toThrowErrorMatchingInlineSnapshot(
    `[JoiValidationError: must be a DateInterval string]`,
  )
  expect(() => validate('2022-01-01/2022-01-02/', schema)).toThrowErrorMatchingInlineSnapshot(
    `[JoiValidationError: must be a DateInterval string]`,
  )
  expect(() =>
    validate('2022-01-01/2022-01-02/2022-01-03', schema),
  ).toThrowErrorMatchingInlineSnapshot(`[JoiValidationError: must be a DateInterval string]`)
})

test('ianaTimezoneSchema', () => {
  const schema = ianaTimezoneSchema

  validate('Europe/London', schema)
  validate('UTC', schema) // to support unit testing
  expect(() => validate(undefined, schema)).toThrowErrorMatchingInlineSnapshot(
    `[JoiValidationError: "value" is required]`,
  )
  expect(() => validate('London', schema)).toThrowErrorMatchingInlineSnapshot(
    `[JoiValidationError: must be a valid IANA timezone string]`,
  )
})

describe('macAddressSchema', () => {
  const macAddresses = [
    'bb:04:17:db:1f:33',
    'fc:5f:1d:3f:d3:a2',
    'ec:f4:72:99:4b:a4',
    'ae:f1:e2:c5:be:24',
    '37:d9:72:ee:02:81',
  ]

  test.each(macAddresses)('valid macAddressSchema: %s', s => {
    expect(validate(s, macAddressSchema)).toBe(s)
  })

  const nonMacAddresses = [
    undefined,
    null,
    0,
    'asdf',
    'bb:04:17:db:1f:33:',
    'bb:04:17:db:1f:33:00',
    'bb:04:17:db:1g',
  ]

  test.each(nonMacAddresses)('invalid macAddressSchema: %s', s => {
    expect(() => validate(s, macAddressSchema)).toThrow(JoiValidationError)
  })
})

describe('uuidSchema', () => {
  test('valid', () => {
    validate('123e4567-e89b-12d3-a456-426614174000', uuidSchema)
  })

  test('invalid', () => {
    expect(() => validate('123e4567-e89b-12d3-a456-4266141740000', uuidSchema)).toThrow(
      JoiValidationError,
    )
    expect(() => validate('123g4567-e89b-12d3-a456-426614174000', uuidSchema)).toThrow(
      JoiValidationError,
    )
  })
})

describe('dateTimeStringSchema', () => {
  const validDateTimes = [
    '2024-07-25',
    '2024-09-30T00:55:12',
    '2024-09-30T00:55:12+02:00',
    '2024-09-30T00:55:12Z',
  ] as IsoDateTime[]

  test.each(validDateTimes)('valid dateTime: %s', s => {
    expect(isValid(s, dateTimeStringSchema)).toBe(true)
    expect(localTime.isValid(s)).toBe(true)
  })

  const invalidDateTimes = [
    undefined, // Non-string
    null, // Non-string
    '', // Empty string
    'T00:55:12Z', // Missing date
    '2024-09-30T00:55', // Missing timezone
    '2024-09-30T00:55Z', // Missing seconds
    '2024-09-30T00:55+02:00', // Missing seconds
    '2024-07-25T0055Z', // Missing colon in time
    '2024-07-25 00:55', // Missing "T" between date and time
    '2024/07/25T00:55', // Invalid date separator ("/" instead of "-")
    '2024-07-25T00-55', // Invalid time separator ("-" instead of ":")
    '2024-07-25T00:55Zextra', // Extra characters after a valid datetime
    'extra2024-07-25T00:55Z', // Extra characters before a valid datetime
    'Some random string', // Random string
    '2024 was a good year', // Year with some text
  ] as IsoDateTime[]

  test.each(invalidDateTimes)('invalid dateTime: %s', s => {
    expect(isValid(s, dateTimeStringSchema)).toBe(false)
    expect(localTime.isValid(s)).toBe(false)
  })
})
