import { expect, test } from 'vitest'
import type { BaseDBEntity, IsoDate, UnixTimestamp } from '../types.js'
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
})

// todo: there are still differences, let's review them
test.todo('compare with zod json schema', () => {
  const zodJsonSchema = z.toJSONSchema(addressZodSchema, { target: 'draft-7' })
  const jsonSchema = addressJsonSchema.build()

  zodJsonSchema.required!.sort() // for snapshot stability

  expect(jsonSchema).toEqual(zodJsonSchema)
})
