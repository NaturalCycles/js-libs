import { AjvSchema } from '@naturalcycles/nodejs-lib/ajv'
import { describe, expect, expectTypeOf, test } from 'vitest'
import { _stringify } from '../string/stringify.js'
import type { BaseDBEntity, Branded, IsoDate, UnixTimestamp } from '../types.js'
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
  createdAt: j.unixTimestamp2000(),
  createdDate: j.isoDate(),
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
    created: j.unixTimestamp2000(),
    updated: j.unixTimestamp2000(),
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
})

describe('array', () => {
  test('should correctly infer the type from the type of the items', () => {
    const schema = j.object({ foo: j.array(j.number()) })
    const [, result] = AjvSchema.create(schema.build()).getValidationResult({ foo: [1, 2, 3] })
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

    result satisfies Foo

    const [, resultOfBadSchema] = AjvSchema.create(badSchema.build()).getValidationResult({} as any)

    // @ts-expect-error
    resultOfBadSchema satisfies Foo
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
