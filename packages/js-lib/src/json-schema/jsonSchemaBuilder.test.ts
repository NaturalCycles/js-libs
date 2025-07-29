import { AjvSchema } from '@naturalcycles/nodejs-lib/ajv'
import { expect, test } from 'vitest'
import type { BaseDBEntity } from '../types.js'
import { jsonSchema } from './jsonSchemaBuilder.js'
import { baseDBEntityJsonSchema } from './jsonSchemas.js'

interface Address {
  countryCode: string
  zip: string
  city: string
  address1: string
  address2?: string
  region?: string
  phone?: string
}

// interface AddressBM extends Address, BaseDBEntity {}
// interface AddressDBM extends Address, SavedDBEntity {}

const addressJsonSchema = jsonSchema.object<Address>({
  countryCode: jsonSchema.string().countryCode(),
  zip: jsonSchema.string().length(1, 40),
  city: jsonSchema.string(),
  address1: jsonSchema.string(),
  address2: jsonSchema.string().optional(),
  region: jsonSchema.string().optional(),
  phone: jsonSchema.string().optional(),
})

const addressBMJsonSchema = addressJsonSchema.extend(baseDBEntityJsonSchema)
const addressDBMJsonSchema = addressJsonSchema.extend(baseDBEntityJsonSchema)

// alternative

const addressBMJsonSchema2 = baseDBEntityJsonSchema.extend(addressJsonSchema)
const addressDBMJsonSchema2 = baseDBEntityJsonSchema.extend(addressJsonSchema)

// alternative 2
const addressBMJsonSchema3 = addressJsonSchema.extend(
  jsonSchema.object<BaseDBEntity>({
    id: jsonSchema.string(),
    created: jsonSchema.unixTimestamp2000(),
    updated: jsonSchema.unixTimestamp2000(),
  }),
)

test('simpleStringSchema', () => {
  const s = jsonSchema.string().build()

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

test('addressDBMJsonSchema', () => {
  expect(addressDBMJsonSchema.build()).toMatchSnapshot()
  expect(addressDBMJsonSchema2.build()).toEqual(addressDBMJsonSchema.build())
})

test('oneOf', () => {
  const s = jsonSchema.allOf([jsonSchema.string(), jsonSchema.string().countryCode()])
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
  const s = addressDBMJsonSchema.$schemaDraft7().$id('AddressDBM').build()
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
  const s = jsonSchema.buffer()
  expect(s.build()).toMatchInlineSnapshot(`
    {
      "instanceof": "Buffer",
    }
  `)

  // const schema = AjvSchema.create(s) // this fails strangely!
  const schema = AjvSchema.create(s.build())
  schema.validate(Buffer.from('abc'), { mutateInput: true })

  expect(schema.isValid('a b c' as any)).toBe(false)
})
