import type { IsoDate, StringMap, UnixTimestamp } from '@naturalcycles/js-lib/types'
import type { StandardJSONSchemaV1, StandardSchemaV1 } from '@standard-schema/spec'
import { expect, expectTypeOf, test } from 'vitest'
import { j } from './jSchema.js'

test('implements StandardSchemaV1 interface', () => {
  const schema = j.string()
  expectTypeOf(schema).toMatchTypeOf<StandardSchemaV1<unknown, string>>()
})

test('~standard has correct version and vendor', () => {
  const schema = j.string()
  expect(schema['~standard'].version).toBe(1)
  expect(schema['~standard'].vendor).toBe('j')
})

test('validate returns value on success', () => {
  const schema = j.string()
  const result = schema['~standard'].validate('hello')
  expect(result).toEqual({ value: 'hello' })
})

test('validate returns issues on failure', () => {
  const schema = j.string()
  const result = schema['~standard'].validate(123)
  expect(result).toHaveProperty('issues')
  const failure = result as StandardSchemaV1.FailureResult
  expect(failure.issues.length).toBeGreaterThan(0)
  expect(failure.issues[0]!.message).toBeDefined()
})

interface TestObj {
  name: string
  age: number
}

test('validate works with object schemas', () => {
  const schema = j.object<TestObj>({
    name: j.string(),
    age: j.number(),
  })
  expectTypeOf(schema).toMatchTypeOf<StandardSchemaV1<unknown, TestObj>>()

  const valid = schema['~standard'].validate({ name: 'Alice', age: 30 })
  expect(valid).toEqual({ value: { name: 'Alice', age: 30 } })

  const invalid = schema['~standard'].validate({ name: 'Alice' })
  expect(invalid).toHaveProperty('issues')
})

test('validate strips unknown properties', () => {
  const schema = j.object<TestObj>({
    name: j.string(),
    age: j.number(),
  })
  const result = schema['~standard'].validate({ name: 'Alice', age: 30, extra: true })
  expect(result).toEqual({ value: { name: 'Alice', age: 30 } })
})

test('implements StandardJSONSchemaV1 interface', () => {
  const schema = j.string()
  expectTypeOf(schema).toMatchTypeOf<StandardJSONSchemaV1<unknown, string>>()
})

test('jsonSchema returns build() output', () => {
  const schema = j.string().minLength(1).maxLength(10)
  const opts = { target: 'draft-07' as const }
  const input = schema['~standard'].jsonSchema.input(opts)
  const output = schema['~standard'].jsonSchema.output(opts)
  expect(input).toEqual({ type: 'string', minLength: 1, maxLength: 10 })
  expect(output).toEqual({ type: 'string', minLength: 1, maxLength: 10 })
})

// Advanced tests

interface Address {
  street: string
  city: string
  zip: string
}

interface User {
  name: string
  email: string
  age: number
  active: boolean
  address: Address
  tags: string[]
}

test('nested object schema', () => {
  const schema = j.object<User>({
    name: j.string().minLength(1),
    email: j.string().email(),
    age: j.number().integer().min(0).max(150),
    active: j.boolean(),
    address: j.object<Address>({
      street: j.string(),
      city: j.string(),
      zip: j.string().regex(/^\d{5}$/),
    }),
    tags: j.array(j.string()),
  })

  expectTypeOf(schema).toMatchTypeOf<StandardSchemaV1<unknown, User>>()
  expectTypeOf(schema).toMatchTypeOf<StandardJSONSchemaV1<unknown, User>>()

  const valid = schema['~standard'].validate({
    name: 'Alice',
    email: 'alice@example.com',
    age: 30,
    active: true,
    address: { street: '123 Main St', city: 'Springfield', zip: '12345' },
    tags: ['admin'],
  })
  expect(valid).toHaveProperty('value')
  expect((valid as StandardSchemaV1.SuccessResult<User>).value.address.city).toBe('Springfield')

  // Invalid nested field
  const invalidNested = schema['~standard'].validate({
    name: 'Alice',
    email: 'alice@example.com',
    age: 30,
    active: true,
    address: { street: '123 Main St', city: 'Springfield', zip: 'bad' },
    tags: [],
  })
  expect(invalidNested).toHaveProperty('issues')

  // Missing nested object entirely
  const missingNested = schema['~standard'].validate({
    name: 'Alice',
    email: 'alice@example.com',
    age: 30,
    active: true,
    tags: [],
  })
  expect(missingNested).toHaveProperty('issues')
})

interface OrderItem {
  productId: string
  quantity: number
  price: number
}

interface Order {
  id: string
  created: UnixTimestamp
  items: OrderItem[]
  note?: string
  metadata: StringMap
}

test('object with optional fields, arrays of objects, and stringMap', () => {
  const schema = j.object<Order>({
    id: j.string().uuid(),
    created: j.number().unixTimestamp2000(),
    items: j.array(
      j.object<OrderItem>({
        productId: j.string(),
        quantity: j.number().integer().min(1),
        price: j.number().min(0),
      }),
    ),
    note: j.string().optional(),
    metadata: j.object.any(),
  })

  expectTypeOf(schema).toMatchTypeOf<StandardSchemaV1<unknown, Order>>()

  const valid = schema['~standard'].validate({
    id: '550e8400-e29b-41d4-a716-446655440000',
    created: 1700000000,
    items: [
      { productId: 'p1', quantity: 2, price: 9.99 },
      { productId: 'p2', quantity: 1, price: 19.99 },
    ],
    metadata: { source: 'web' },
  })
  expect(valid).toHaveProperty('value')

  // Invalid item in array
  const invalidItem = schema['~standard'].validate({
    id: '550e8400-e29b-41d4-a716-446655440000',
    created: 1700000000,
    items: [{ productId: 'p1', quantity: 0, price: 9.99 }],
    metadata: {},
  })
  expect(invalidItem).toHaveProperty('issues')
})

enum Status {
  active = 'active',
  inactive = 'inactive',
}

interface Config {
  status: Status
  date: IsoDate
  scores: number[]
  label: 'a' | 'b'
}

test('enum, isoDate, array, and literal union', () => {
  const schema = j.object<Config>({
    status: j.enum(Status),
    date: j.string().isoDate(),
    scores: j.array(j.number().min(0).max(100)),
    label: j.oneOf([j.literal('a'), j.literal('b')]),
  })

  expectTypeOf(schema).toMatchTypeOf<StandardSchemaV1<unknown, Config>>()

  const valid = schema['~standard'].validate({
    status: 'active',
    date: '2024-06-15',
    scores: [80, 95],
    label: 'a',
  })
  expect(valid).toHaveProperty('value')

  const invalidEnum = schema['~standard'].validate({
    status: 'unknown',
    date: '2024-06-15',
    scores: [],
    label: 'a',
  })
  expect(invalidEnum).toHaveProperty('issues')

  const invalidDate = schema['~standard'].validate({
    status: 'active',
    date: 'not-a-date',
    scores: [],
    label: 'b',
  })
  expect(invalidDate).toHaveProperty('issues')
})

test('nullable and optional fields', () => {
  interface WithNullable {
    required: string
    nullable: string | null
    optional?: number | undefined
  }

  const schema = j.object<WithNullable>({
    required: j.string(),
    nullable: j.string().nullable(),
    optional: j.number().optional(),
  })

  expectTypeOf(schema).toMatchTypeOf<StandardSchemaV1<unknown, WithNullable>>()

  const withAll = schema['~standard'].validate({
    required: 'yes',
    nullable: null,
    optional: 42,
  })
  expect(withAll).toHaveProperty('value')

  const withoutOptional = schema['~standard'].validate({
    required: 'yes',
    nullable: 'hello',
  })
  expect(withoutOptional).toHaveProperty('value')

  // null not allowed for required field
  const nullRequired = schema['~standard'].validate({
    required: null,
    nullable: null,
  })
  expect(nullRequired).toHaveProperty('issues')
})

test('jsonSchema for nested object', () => {
  const schema = j.object<{ name: string; address: Address }>({
    name: j.string(),
    address: j.object<Address>({
      street: j.string(),
      city: j.string(),
      zip: j.string(),
    }),
  })

  const jsonSchema = schema['~standard'].jsonSchema.input({ target: 'draft-07' })
  expect(jsonSchema).toHaveProperty('type', 'object')
  expect(jsonSchema).toHaveProperty('properties')
  const props = jsonSchema['properties'] as Record<string, any>
  expect(props['name']).toEqual({ type: 'string' })
  expect(props['address']).toHaveProperty('type', 'object')
  expect(props['address']['properties']).toHaveProperty('street')
  expect(props['address']['properties']).toHaveProperty('city')
  expect(props['address']['properties']).toHaveProperty('zip')
})

test('jsonSchema for array of objects', () => {
  const schema = j.array(
    j.object.infer({
      id: j.number().integer(),
      value: j.string(),
    }),
  )

  const jsonSchema = schema['~standard'].jsonSchema.input({ target: 'draft-2020-12' })
  expect(jsonSchema).toHaveProperty('type', 'array')
  const items = jsonSchema['items'] as Record<string, any>
  expect(items).toHaveProperty('type', 'object')
  expect(items['properties']).toHaveProperty('id')
  expect(items['properties']).toHaveProperty('value')
})

test('~standard is cached after first access', () => {
  const schema = j.string()
  const first = schema['~standard']
  const second = schema['~standard']
  expect(first).toBe(second)
})

test('vitest expect.schemaMatching works with JSchema', () => {
  const userSchema = j.object<User>({
    name: j.string().minLength(1),
    email: j.string().email(),
    age: j.number().integer().min(0).max(150),
    active: j.boolean(),
    address: j.object<Address>({
      street: j.string(),
      city: j.string(),
      zip: j.string().regex(/^\d{5}$/),
    }),
    tags: j.array(j.string()),
  })

  const user = {
    name: 'Alice',
    email: 'alice@example.com',
    age: 30,
    active: true,
    address: { street: '123 Main St', city: 'Springfield', zip: '12345' },
    tags: ['admin'],
  }

  expect(user).toEqual(expect.schemaMatching(userSchema))
})
