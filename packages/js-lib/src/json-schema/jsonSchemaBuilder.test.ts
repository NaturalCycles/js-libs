import { AjvSchema } from '@naturalcycles/nodejs-lib/ajv'
import { describe, expect, expectTypeOf, test } from 'vitest'
import { localDate } from '../datetime/localDate.js'
import { localTime } from '../datetime/localTime.js'
import { _numberEnumValues, _stringEnumValues } from '../enum.util.js'
import { _stringify } from '../string/stringify.js'
import type { BaseDBEntity, Branded, IsoDate, IsoDateTime, UnixTimestamp } from '../types.js'
import { z } from '../zod/index.js'
import { j } from './jsonSchemaBuilder.js'
import { baseDBEntityJsonSchema } from './jsonSchemas.js'

interface Address {
  createdAt: UnixTimestamp
  createdDate: IsoDate
  countryCode: string
  zip: string
  city: string
  address1: string
  address2?: string
  region?: string
  phone?: string
}

// interface AddressBM extends Address, BaseDBEntity {}

const addressJsonSchema = j.rootObject<Address>({
  createdAt: j.integer().unixTimestamp2000(),
  createdDate: j.string().isoDate(),
  countryCode: j.string().countryCode(),
  zip: j.string().length(1, 40),
  city: j.string(),
  address1: j.string(),
  address2: j.string().optional(),
  region: j.string().optional(),
  phone: j.string().optional(),
})

const addressZodSchema = z.object({
  createdAt: z.unixTimestamp2000(),
  createdDate: z.isoDate(),
  countryCode: z.string(),
  zip: z.string().min(1).max(40),
  city: z.string(),
  address1: z.string(),
  address2: z.string().optional(),
  region: z.string().optional(),
  phone: z.string().optional(),
})

const addressBMJsonSchema = addressJsonSchema.extend(baseDBEntityJsonSchema)

// alternative

const addressBMJsonSchema2 = j
  .rootObject({})
  .extend(baseDBEntityJsonSchema.extend(addressJsonSchema))

// alternative 2
const addressBMJsonSchema3 = addressJsonSchema.extend(
  j.object<BaseDBEntity>({
    id: j.string(),
    created: j.integer().unixTimestamp2000(),
    updated: j.integer().unixTimestamp2000(),
  }),
)

test('simpleStringSchema', () => {
  const s = j.string().build()

  expect(s).toMatchInlineSnapshot(`
    {
      "type": "string",
    }
  `)
})

test('addressSchema', () => {
  expect(addressJsonSchema.build()).toMatchSnapshot()
})

test('addressBMJsonSchema', () => {
  expect(addressBMJsonSchema.build()).toMatchSnapshot()
  expect(addressBMJsonSchema2.build()).toEqual(addressBMJsonSchema.build())
  expect(addressBMJsonSchema3.build()).toEqual(addressBMJsonSchema.build())
})

test('oneOf', () => {
  const s = j.allOf([j.string(), j.string().countryCode()])
  expect(s.build()).toMatchInlineSnapshot(`
    {
      "allOf": [
        {
          "type": "string",
        },
        {
          "format": "countryCode",
          "type": "string",
        },
      ],
    }
  `)
})

test('order', () => {
  const s = addressBMJsonSchema.$schemaDraft7().$id('AddressBM').build()
  expect(Object.keys(s)).toMatchInlineSnapshot(`
    [
      "$schema",
      "$id",
      "type",
      "properties",
      "required",
      "additionalProperties",
    ]
  `)
})

test('buffer', () => {
  const s = j.buffer()
  expect(s.build()).toMatchInlineSnapshot(`
    {
      "instanceof": "Buffer",
    }
  `)

  // const schema = AjvSchema.create(s) // this fails strangely!
  const schema = AjvSchema.create(s.build())
  schema.validate(Buffer.from('abc'))

  expect(schema.isValid('a b c' as any)).toBe(false)
})

// todo: there are still differences, let's review them
test.todo('compare with zod json schema', () => {
  const zodJsonSchema = z.toJSONSchema(addressZodSchema, { target: 'draft-7' })
  const jsonSchema = addressJsonSchema.build()

  zodJsonSchema.required!.sort() // for snapshot stability

  expect(jsonSchema).toEqual(zodJsonSchema)
})

describe('integer', () => {
  describe('branded', () => {
    type BPM = Branded<number, 'BPM'>

    test('should assign the branded type', () => {
      const schema = j.object({
        foo: j.number().branded<BPM>(),
      })
      const [, result] = AjvSchema.create(schema.build()).getValidationResult({ foo: 1 as BPM })
      // oxlint-disable-next-line no-unused-expressions
      result satisfies { foo: BPM }
    })

    test('should be chainable with other commands', () => {
      const schema = j.object({
        foo: j.number().branded<BPM>().max(2),
      })

      const [err, result] = AjvSchema.create(schema.build()).getValidationResult({
        foo: 10 as BPM,
      })

      expect(err).toMatchInlineSnapshot(`
        [AjvValidationError: Object/foo must be <= 2
        Input: { foo: 10 }]
      `)
      expect(result).toEqual({ foo: 10 })
      expectTypeOf(result).toEqualTypeOf<{ foo: BPM }>()
    })
  })
})

describe('string', () => {
  describe('branded', () => {
    type AccountId = Branded<string, 'AccountId'>

    test('should assign the branded type', () => {
      const schema = j.object({
        foo: j.string().branded<AccountId>(),
      })
      const [, result] = AjvSchema.create(schema.build()).getValidationResult({
        foo: 'bingbong' as AccountId,
      })
      expectTypeOf(result).toEqualTypeOf<{ foo: AccountId }>()
    })

    test('should be chainable with other commands', () => {
      const schema = j.object({
        foo: j.string().branded<AccountId>().max(2),
      })

      const [err, result] = AjvSchema.create(schema.build()).getValidationResult({
        foo: 'bingbong' as AccountId,
      })

      expect(err).toMatchInlineSnapshot(`
        [AjvValidationError: Object/foo must NOT have more than 2 characters
        Input: { foo: 'bingbong' }]
      `)
      expect(result).toEqual({ foo: 'bingbong' })
      expectTypeOf(result).toEqualTypeOf<{ foo: AccountId }>()
    })
  })

  describe('regex', () => {
    test('should accept RegExp and use it as "pattern"', () => {
      const schema = j.object({
        foo: j.string().regex(/^\d{1,2}$/),
      })
      const ajvSchema = AjvSchema.create(schema.build())

      const [err1] = ajvSchema.getValidationResult({
        foo: 'bingbong' as any,
      })
      expect(err1).not.toBeNull()

      const [err2] = ajvSchema.getValidationResult({
        foo: '1' as any,
      })
      expect(err2).toBeNull()

      const [err3] = ajvSchema.getValidationResult({
        foo: '12' as any,
      })
      expect(err3).toBeNull()
    })
  })

  describe('isoDate', () => {
    const schema = j.object({
      foo: j.string().isoDate(),
    })
    const ajvSchema = AjvSchema.create(schema.build())

    test('should assign IsoDate branded type', () => {
      const [, result] = ajvSchema.getValidationResult({
        foo: '2001-01-01' as any,
      })
      expectTypeOf(result).toEqualTypeOf<{ foo: IsoDate }>()
    })

    const validCases = ['2001-01-01', '1984-02-29', '2026-08-08', '2000-02-29']
    const d = localDate.fromString('2001-01-01' as IsoDate)
    for (let i = 1; i < 366; ++i) {
      validCases.push(d.plusDays(i).toISODate())
    }

    test.each(validCases)('should accept valid case: %s', input => {
      const [err, result] = ajvSchema.getValidationResult({
        foo: input as any,
      })

      expect(err).toBeNull()
      expect(result.foo).toBe(input)
    })

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
    test.each(invalidCases)('should reject invalid case: %s', input => {
      const [err, result] = ajvSchema.getValidationResult({
        foo: input as any,
      })

      expect(err).not.toBeNull()
      expect(result.foo).toBe(input)
    })
  })

  describe('isoDateTime', () => {
    const schema = j.object({
      foo: j.string().isoDateTime(),
    })
    const ajvSchema = AjvSchema.create(schema.build())

    test('should assign IsoDateTime branded type', () => {
      const [, result] = ajvSchema.getValidationResult({
        foo: '2001-01-01T11:11:11Z' as any,
      })
      expectTypeOf(result).toEqualTypeOf<{ foo: IsoDateTime }>()
    })

    const validCases = [
      '2001-01-01T01:01:01',
      '2001-01-01T01:01:01Z',
      '2001-01-01T01:01:01+14:00',
      '2001-01-01T01:01:01-12:00',
      '2000-02-29T01:01:01',
    ]
    const t = localTime.fromIsoDateTimeString('2001-01-01T01:01:01Z' as IsoDateTime)
    for (let i = 1; i < 366; ++i) {
      validCases.push(t.plusDays(i).toISODateTime())
    }

    test.each(validCases)('should accept valid case: %s', input => {
      const [err, result] = ajvSchema.getValidationResult({
        foo: input as any,
      })

      expect(err).toBeNull()
      expect(result.foo).toBe(input)
    })

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
    test.each(invalidCases)('should reject invalid case: %s', input => {
      const [err, result] = ajvSchema.getValidationResult({
        foo: input as any,
      })

      expect(err).not.toBeNull()
      expect(result.foo).toBe(input)
    })
  })
})

describe('object', () => {
  describe('dbEntity', () => {
    test('should correctly infer the type', () => {
      const schema = j.dbEntity({ foo: j.array(j.number()) })
      const [, result] = AjvSchema.create(schema.build()).getValidationResult({
        id: 'id',
        created: 12313123 as any,
        updated: 12313123 as any,
        foo: [1, 2, 3],
      })
      // oxlint-disable-next-line no-unused-expressions
      result satisfies { id: string; created: UnixTimestamp; updated: UnixTimestamp; foo: number[] }
    })
  })

  describe('additionalProps', () => {
    test('should not remove unspecified properties when set to `true`', () => {
      const schema = j.object({ foo: j.array(j.number()) }).additionalProps(true)

      const [err, result] = AjvSchema.create(schema.build()).getValidationResult({
        foo: [1, 2, 3],
        // @ts-expect-error
        bar: 'keep me',
      })

      expect(err).toBeNull()
      // oxlint-disable-next-line no-unused-expressions
      result satisfies { foo: number[] }
      expect(result).toEqual({
        foo: [1, 2, 3],
        bar: 'keep me',
      })
    })

    test('should remove unspecified properties when set to `false`', () => {
      const schema = j.object({ foo: j.array(j.number()) }).additionalProps(false)

      const [err, result] = AjvSchema.create(schema.build()).getValidationResult({
        foo: [1, 2, 3],
        // @ts-expect-error
        bar: 'keep me',
      })

      expect(err).toBeNull()
      // oxlint-disable-next-line no-unused-expressions
      result satisfies { foo: number[] }
      expect(result).toEqual({
        foo: [1, 2, 3],
      })
    })

    test('should remove unspecified properties when not set', () => {
      const schema = j.object({ foo: j.array(j.number()) })

      const [err, result] = AjvSchema.create(schema.build()).getValidationResult({
        foo: [1, 2, 3],
        // @ts-expect-error
        bar: 'keep me',
      })

      expect(err).toBeNull()
      // oxlint-disable-next-line no-unused-expressions
      result satisfies { foo: number[] }
      expect(result).toEqual({
        foo: [1, 2, 3],
      })
    })
  })
})

describe('array', () => {
  test('should correctly infer the type from the type of the items', () => {
    const schema = j.object({ foo: j.array(j.number()) })
    const [, result] = AjvSchema.create(schema.build()).getValidationResult({ foo: [1, 2, 3] })
    // oxlint-disable-next-line no-unused-expressions
    result satisfies { foo: number[] }
    expectTypeOf(result).toEqualTypeOf<{ foo: number[] }>()
  })
})

describe('optional', () => {
  test('should correctly infer the type of optional fields', () => {
    interface Foo {
      reqNum: number
      optNum?: number
      reqStr: string
      optStr?: string
      reqArrOfReqNum: number[]
      optArrOfReqNum?: number[] | undefined
    }
    const schema = j.object({
      reqNum: j.number(),
      optNum: j.number().optional(),
      reqStr: j.string(),
      optStr: j.string().optional(),
      reqArrOfReqNum: j.array(j.number()),
      optArrOfReqNum: j.array(j.number()).optional(),
    })
    const badSchema = j.object({
      reqNum: j.number().optional(),
      optNum: j.number(),
      reqStr: j.string().optional(),
      optStr: j.string(),
    })

    const [, result] = AjvSchema.create(schema.build()).getValidationResult({} as any)

    // oxlint-disable-next-line no-unused-expressions
    result satisfies Foo

    const [, resultOfBadSchema] = AjvSchema.create(badSchema.build()).getValidationResult({} as any)

    // @ts-expect-error
    resultOfBadSchema satisfies Foo // oxlint-disable-line no-unused-expressions
  })

  test('should correctly require an optional property', () => {
    interface Foo {
      reqProp: string
    }
    const optionalString = j.string().optional()
    const schema = j.object({
      reqProp: optionalString.optional(false),
    })

    const [err, result] = AjvSchema.create(schema.build()).getValidationResult({} as any)
    // oxlint-disable-next-line no-unused-expressions
    result satisfies Foo
    expect(err).not.toBeNull()
  })

  test('should mark the property as optional', () => {
    const schema = j.object({
      foo: j.string().optional(),
      bar: j.boolean().optional(),
    })
    const jsonSchema = schema.build()
    const testCases = [{} as any, { foo: undefined }, { foo: 'bar' }, { foo: 'bar', bar: true }]

    testCases.forEach(test => {
      const [err] = AjvSchema.create(jsonSchema).getValidationResult(test)
      // eslint-disable-next-line vitest/valid-expect
      expect(err, _stringify(test)).toBeNull()
    })
  })
})

describe('nullable', () => {
  test('should correctly infer the type of nullable fields', () => {
    type BPM = Branded<number, 'BPM'>
    interface Foo {
      num: number | null
      str: string | null
      arr: string[] | null
      arr2: (string | null)[]
      brand: BPM | null
    }
    const schema = j.object({
      num: j.number().nullable(),
      str: j.string().nullable(),
      arr: j.array(j.string()).nullable(),
      arr2: j.array(j.string().nullable()),
      brand: j.number().branded<BPM>().nullable(),
    })

    const [, result] = AjvSchema.create(schema.build()).getValidationResult({} as any)

    // oxlint-disable-next-line no-unused-expressions
    result satisfies Foo
  })

  test('should correctly accept null values', () => {
    const schema = j.object({
      num: j.number().nullable(),
      str: j.string().nullable(),
      arr: j.array(j.string()).nullable(),
      arr2: j.array(j.string().nullable()),
    })

    const [err] = AjvSchema.create(schema.build()).getValidationResult({
      num: null,
      str: null,
      arr: null,
      arr2: [null],
    } as any)

    expect(err).toBeNull()
  })
})

describe('oneOf', () => {
  test('should correctly infer the type of its constituents', () => {
    interface Foo {
      foo: string | null
    }
    const schema = j.object({
      foo: j.oneOf([j.string(), j.null()]),
    })

    const [, result] = AjvSchema.create(schema.build()).getValidationResult({
      foo: null,
    })

    // oxlint-disable-next-line no-unused-expressions
    result satisfies Foo
  })

  test('should accept any of the listed types', () => {
    const schema = j.object({
      foo: j.oneOf([j.string(), j.null()]),
      bar: j.oneOf([j.number(), j.null()]),
      arr: j.array(j.oneOf([j.string(), j.number()])),
    })

    const [err] = AjvSchema.create(schema.build()).getValidationResult({
      foo: null,
      bar: null,
      arr: ['foo', 1, 'bar', 2],
    })

    expect(err).toBeNull()
  })
})

describe('const', () => {
  test('should correctly infer the type', () => {
    enum Bar {
      FOO = 1,
      BAR = 2,
    }
    interface Foo {
      foo: Bar.FOO
      bar: Bar
      n: null
    }
    const schema = j.object({
      foo: j.const(Bar.FOO),
      bar: j.enum(_numberEnumValues(Bar)),
      n: j.const(null),
    })

    const [, result] = AjvSchema.create(schema.build()).getValidationResult({} as any)

    // oxlint-disable-next-line no-unused-expressions
    result satisfies Foo
  })

  test('should accept only the given value', () => {
    const schema = j.object({
      foo: j.const(1),
      n: j.const(null),
    })

    const [err] = AjvSchema.create(schema.build()).getValidationResult({
      foo: 1,
      n: null,
    } as any)

    expect(err).toBeNull()

    const [err1] = AjvSchema.create(schema.build()).getValidationResult({
      foo: 2,
      n: null,
    } as any)

    expect(err1).not.toBeNull()

    const [err2] = AjvSchema.create(schema.build()).getValidationResult({
      foo: 1,
      n: 1,
    } as any)

    expect(err2).not.toBeNull()
  })
})

describe('enum', () => {
  describe('receiving StringEnum object', () => {
    test('should infer the type properly', () => {
      enum StringFoo {
        MAD_HATTER = 'mad hatter',
        MARCH_HARE = 'march hare',
      }
      interface Foo {
        en: StringFoo
      }
      const schema = j.object({
        en: j.enum(StringFoo),
      })

      const [, result] = AjvSchema.create(schema.build()).getValidationResult({} as any)

      // oxlint-disable-next-line no-unused-expressions
      result satisfies Foo
    })

    test('should accept the listed values', () => {
      enum StringFoo {
        MAD_HATTER = 'mad hatter',
        MARCH_HARE = 'march hare',
      }
      const schema = j.object({
        en: j.enum(StringFoo),
      })

      _stringEnumValues(StringFoo).forEach(value => {
        const [err] = AjvSchema.create(schema.build()).getValidationResult({
          en: value,
        } as any)

        // eslint-disable-next-line vitest/valid-expect
        expect(err, value).toBeNull()
      })

      const [err] = AjvSchema.create(schema.build()).getValidationResult({
        en: 'queen of hearts',
      } as any)

      expect(err).not.toBeNull()
    })
  })

  describe('receiving NumberEnum object', () => {
    test('should infer the type properly', () => {
      enum NumFoo {
        THE_DODO = 1,
        THE_CHESIRE_CAT = 2,
      }
      interface Foo {
        en: NumFoo
      }
      const schema = j.object({
        en: j.enum(NumFoo),
      })

      const [, result] = AjvSchema.create(schema.build()).getValidationResult({} as any)

      // oxlint-disable-next-line no-unused-expressions
      result satisfies Foo
    })

    test('should accept the listed values', () => {
      enum NumFoo {
        THE_DODO = 1,
        THE_CHESIRE_CAT = 2,
      }
      const schema = j.object({
        en: j.enum(NumFoo),
      })

      _numberEnumValues(NumFoo).forEach(value => {
        const [err] = AjvSchema.create(schema.build()).getValidationResult({
          en: value,
        } as any)

        // eslint-disable-next-line vitest/valid-expect
        expect(err, String(value)).toBeNull()
      })

      const [err] = AjvSchema.create(schema.build()).getValidationResult({
        en: 3,
      } as any)

      expect(err).not.toBeNull()
    })
  })

  describe('receiving an array of values', () => {
    test('should infer the type properly', () => {
      const schema = j.object({
        en: j.enum(['a', 'b', 1]),
      })

      const [, result] = AjvSchema.create(schema.build()).getValidationResult({} as any)

      // oxlint-disable-next-line no-unused-expressions
      result satisfies { en: 'a' | 'b' | 1 }
    })

    test('should accept the listed values', () => {
      const values = ['a', 'b', 1]
      const schema = j.object({
        en: j.enum(values),
      })

      values.forEach(value => {
        const [err] = AjvSchema.create(schema.build()).getValidationResult({
          en: value,
        } as any)

        // eslint-disable-next-line vitest/valid-expect
        expect(err, String(value)).toBeNull()
      })
      ;['c', 2].forEach(value => {
        const [err] = AjvSchema.create(schema.build()).getValidationResult({
          en: value,
        } as any)

        // eslint-disable-next-line vitest/valid-expect
        expect(err, String(value)).not.toBeNull()
      })
    })
  })
})
