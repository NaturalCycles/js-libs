import { Set2 } from '@naturalcycles/js-lib/object'
import type { BaseDBEntity, StringMap } from '@naturalcycles/js-lib/types'
import { expect, it } from 'vitest'
import type { JSchema } from '../jSchema.js'
import { j } from '../jSchema.js'
import { generateMockFromSchema, generateMockVariantsFromSchema } from './generateMockFromSchema.js'

enum Color {
  RED = 1,
  BLUE = 2,
}

enum Mode {
  A = 'a',
  B = 'b',
}

it.each<{ label: string; schema: JSchema<any, any>; expected: unknown }>([
  {
    label: 'string',
    schema: j.string(),
    expected: 'mock',
  },
  {
    label: 'string with length limits',
    schema: j.string().minLength(6).maxLength(8),
    expected: 'mockxx',
  },
  {
    label: 'email',
    schema: j.string().email(),
    expected: 'mock@example.com',
  },
  {
    label: 'iso date with bounds',
    schema: j.string().isoDate().after('2030-01-01').sameOrBefore('2030-01-02'),
    expected: '2030-01-02',
  },
  {
    label: 'iso date time',
    schema: j.string().isoDateTime(),
    expected: '2022-06-15T10:00:00Z',
  },
  {
    label: 'iso month',
    schema: j.string().isoMonth(),
    expected: '2022-06',
  },
  {
    label: 'utc offset string',
    schema: j.string().utcOffset(),
    expected: '+02:00',
  },
  {
    label: 'iana timezone',
    schema: j.string().ianaTimezone(),
    expected: 'Africa/Abidjan',
  },
  {
    label: 'string transforms',
    schema: j.string().trim().toLowerCase().truncate(3),
    expected: 'moc',
  },
  {
    label: 'built-in format',
    schema: j.string().uuid(),
    expected: '123e4567-e89b-12d3-a456-426614174000',
  },
  {
    label: 'number with bounds',
    schema: j.number().integer().min(2).exclusiveMax(9).multipleOf(4),
    expected: 4,
  },
  {
    label: 'number below a negative maximum',
    schema: j.number().max(-3).multipleOf(4),
    expected: -4,
  },
  {
    label: 'number between exclusive bounds',
    schema: j.number().exclusiveMin(0).exclusiveMax(1),
    expected: 0.5,
  },
  {
    label: 'integer above a fractional minimum',
    schema: j.number().integer().min(1.5),
    expected: 2,
  },
  {
    label: 'unix timestamp',
    schema: j.number().unixTimestamp(),
    expected: 1_655_287_200,
  },
  {
    label: 'unix timestamp in millis',
    schema: j.number().unixTimestampMillis(),
    expected: 1_655_287_200_000,
  },
  {
    label: 'utc offset number',
    schema: j.number().utcOffset(),
    expected: 15,
  },
  {
    label: 'number with precision',
    schema: j.number().precision(2),
    expected: 1,
  },
  {
    label: 'boolean',
    schema: j.boolean(),
    expected: true,
  },
  {
    label: 'array',
    schema: j.array(j.string()).minLength(1),
    expected: ['mock'],
  },
  {
    label: 'array with a maximum of no items',
    schema: j.array(j.string()).maxLength(0),
    expected: [],
  },
  {
    label: 'tuple',
    schema: j.tuple([j.string(), j.number()]),
    expected: ['mock', 1],
  },
  {
    label: 'set',
    schema: j.set(j.string()).min(1),
    expected: new Set2(['mock']),
  },
  {
    label: 'buffer',
    schema: j.buffer(),
    expected: Buffer.from('mock'),
  },
  {
    label: 'number enum',
    schema: j.enum(Color),
    expected: Color.RED,
  },
  {
    label: 'string enum',
    schema: j.enum(Mode),
    expected: Mode.A,
  },
  {
    label: 'literal',
    schema: j.literal('x'),
    expected: 'x',
  },
  {
    label: 'oneOf',
    schema: j.oneOf([j.string(), j.number()]),
    expected: 'mock',
  },
  {
    label: 'anyOf',
    schema: j.anyOf([j.string(), j.number()]),
    expected: 'mock',
  },
  {
    label: 'anyOfBy',
    schema: j.anyOfBy('kind', {
      a: j.object<{ kind: 'a' }>({ kind: j.literal('a') }),
      b: j.object<{ kind: 'b' }>({ kind: j.literal('b') }),
    }),
    expected: { kind: 'a' },
  },
  {
    label: 'anyOfThese',
    schema: j.anyOfThese([j.string(), j.number()]),
    expected: 'mock',
  },
  {
    label: 'nullable',
    schema: j.string().nullable(),
    expected: 'mock',
  },
  {
    label: 'optional values',
    schema: j.string().optional([null, '']),
    expected: 'mock',
  },
  {
    label: 'record',
    schema: j.object.record(
      j
        .string()
        .regex(/^[a-z]+$/)
        .example('key'),
      j.number(),
    ),
    expected: { key: 1 },
  },
  {
    label: 'string map',
    schema: j.object.stringMap(j.number()),
    expected: { key: 1 },
  },
  {
    label: 'enum keys',
    schema: j.object.withEnumKeys(Color, j.number()),
    expected: { 1: 1, 2: 1 },
  },
  {
    label: 'db entity',
    schema: j.object.dbEntity<BaseDBEntity>({}),
    expected: { id: 'mock', created: 1_655_287_200, updated: 1_655_287_200 },
  },
  {
    label: 'Date instance',
    schema: j.any().instanceof('Date'),
    // oxlint-disable-next-line no-restricted-globals -- a literal value, not built the way the generator builds it
    expected: new Date('2022-06-15T10:00:00.000Z'),
  },
  {
    label: 'example',
    schema: j
      .string()
      .regex(/^[A-Z]{3}-\d{4}$/)
      .example('ABC-1234'),
    expected: 'ABC-1234',
  },
  {
    label: 'default',
    schema: j.number().default(7),
    expected: 7,
  },
  {
    label: 'any',
    schema: j.any(),
    expected: 'mock',
  },
])('should generate the value for: $label', ({ schema: valueSchema, expected }) => {
  const schema = j.object<{ value: any }>({ value: valueSchema })

  expect(generateMockFromSchema(schema, { allFields: true })).toStrictEqual({ value: expected })
})

it('should use the example of an object as is, without generating its fields', () => {
  const schema = j.object<{ inner: { code: string } }>({
    inner: j
      .object<{ code: string }>({ code: j.string().regex(/^\d{4}$/) })
      .example({ code: '1234' }),
  })

  expect(generateMockFromSchema(schema)).toEqual({ inner: { code: '1234' } })
})

it('should fill only the required fields by default', () => {
  const schema = j.object<{ name: string; nickname?: string }>({
    name: j.string(),
    nickname: j.string().optional(),
  })

  expect(generateMockFromSchema(schema)).toEqual({ name: 'mock' })
})

it('should fill every field, with one item in each list and map, when allFields is set', () => {
  const schema = j.object<{ nickname?: string; tags?: string[]; scores?: StringMap<number> }>({
    nickname: j.string().optional(),
    tags: j.array(j.string()).optional(),
    scores: j.object.stringMap(j.number()).optional(),
  })

  expect(generateMockFromSchema(schema, { allFields: true })).toEqual({
    nickname: 'mock',
    tags: ['mock'],
    scores: { key: 1 },
  })
})

it('should add optional fields until the minimum number of properties is reached', () => {
  const schema = j
    .object<{ a?: string; b?: string; c?: string }>({
      a: j.string().optional(),
      b: j.string().optional(),
      c: j.string().optional(),
    })
    .minProperties(2)

  expect(generateMockFromSchema(schema)).toEqual({ a: 'mock', b: 'mock' })
})

it('should fill no more fields than the maximum number of properties', () => {
  const schema = j
    .object<{ a?: string; b?: string }>({
      a: j.string().optional(),
      b: j.string().optional(),
    })
    .maxProperties(1)

  expect(generateMockFromSchema(schema, { allFields: true })).toEqual({ a: 'mock' })
})

it('should fill a map when the minimum number of properties needs it', () => {
  const schema = j.object<{ scores: StringMap<number> }>({
    scores: j.object.stringMap(j.number()).minProperties(1),
  })

  expect(generateMockFromSchema(schema)).toEqual({ scores: { key: 1 } })
})

it('should fill only the first field of a group of exclusive properties', () => {
  const schema = j
    .object<{ a?: string; b?: string }>({
      a: j.string().optional(),
      b: j.string().optional(),
    })
    .exclusiveProperties(['a', 'b'])

  expect(generateMockFromSchema(schema, { allFields: true })).toEqual({ a: 'mock' })
})

it('should keep the required field of a group of exclusive properties', () => {
  const schema = j
    .object<{ a?: string; b: string }>({
      a: j.string().optional(),
      b: j.string(),
    })
    .exclusiveProperties(['a', 'b'])

  expect(generateMockFromSchema(schema, { allFields: true })).toEqual({ b: 'mock' })
})

it('should not take a null literal as the branch of a union', () => {
  const schema = j.object<{ value: string | null }>({
    value: j.anyOf([j.literal(null), j.string()]),
  })

  expect(generateMockFromSchema(schema)).toEqual({ value: 'mock' })
})

it('should generate a set at the root', () => {
  const schema = j.set(j.string()).min(1)

  expect(generateMockFromSchema(schema)).toStrictEqual(new Set2(['mock']))
})

const shape = j.anyOfThese([
  j.object<{ a: string }>({ a: j.string() }),
  j.object<{ b: number }>({ b: j.number() }),
])
const shapeSchema = j.object<{ shape: { a: string } | { b: number } }>({ shape })

it('should return the generated mock, then one variant for each other branch of a union', () => {
  const variants = generateMockVariantsFromSchema(shapeSchema)

  expect(variants).toStrictEqual([
    { value: { shape: { a: 'mock' } } },
    { value: { shape: { b: 1 } }, choice: { path: 'shape', option: 1 } },
  ])
  expect(variants[0]!.value).toStrictEqual(generateMockFromSchema(shapeSchema, { allFields: true }))
})

it('should return variants for a union inside a branch of another union', () => {
  type Inner = { x: string } | { y: string } | { z: string }
  const inner = j.anyOfThese([
    j.object<{ x: string }>({ x: j.string() }),
    j.object<{ y: string }>({ y: j.string() }),
    j.object<{ z: string }>({ z: j.string() }),
  ])
  const schema = j.object<{ outer: { inner: Inner } | { b: string } }>({
    outer: j.anyOfThese([
      j.object<{ inner: Inner }>({ inner }),
      j.object<{ b: string }>({ b: j.string() }),
    ]),
  })

  expect(generateMockVariantsFromSchema(schema)).toStrictEqual([
    { value: { outer: { inner: { x: 'mock' } } } },
    { value: { outer: { b: 'mock' } }, choice: { path: 'outer', option: 1 } },
    { value: { outer: { inner: { y: 'mock' } } }, choice: { path: 'outer.inner', option: 1 } },
    { value: { outer: { inner: { z: 'mock' } } }, choice: { path: 'outer.inner', option: 2 } },
  ])
})

it('should set the anyOfBy property to the key of its branch', () => {
  const kindSchema = j.enum(Color)
  const schema = j.object<{ device: { kind: Color; name: string } }>({
    device: j.anyOfBy('kind', {
      [Color.RED]: j.object<{ kind: Color; name: string }>({ kind: kindSchema, name: j.string() }),
      [Color.BLUE]: j.object<{ kind: Color; name: string }>({ kind: kindSchema, name: j.string() }),
    }),
  })

  expect(generateMockVariantsFromSchema(schema)).toStrictEqual([
    { value: { device: { kind: Color.RED, name: 'mock' } } },
    {
      value: { device: { kind: Color.BLUE, name: 'mock' } },
      choice: { path: 'device', option: 1, key: '2' },
    },
  ])
})

it('should return variants for a union inside an anyOfBy branch', () => {
  type Detail = { x: string } | { y: string }
  const detail = j.anyOfThese([
    j.object<{ x: string }>({ x: j.string() }),
    j.object<{ y: string }>({ y: j.string() }),
  ])
  const schema = j.object<{ device: { kind: Mode; detail: Detail } }>({
    device: j.anyOfBy('kind', {
      [Mode.A]: j.object<{ kind: Mode; detail: Detail }>({ kind: j.enum(Mode), detail }),
    }),
  })

  expect(generateMockVariantsFromSchema(schema).map(variant => variant.value)).toStrictEqual([
    { device: { kind: Mode.A, detail: { x: 'mock' } } },
    { device: { kind: Mode.A, detail: { y: 'mock' } } },
  ])
})

it('should label a union inside list items with the path of the list', () => {
  const schema = j.object<{ shapes: ({ a: string } | { b: number })[] }>({
    shapes: j.array(shape),
  })

  expect(generateMockVariantsFromSchema(schema)).toStrictEqual([
    { value: { shapes: [{ a: 'mock' }] } },
    { value: { shapes: [{ b: 1 }] }, choice: { path: 'shapes', option: 1 } },
  ])
})

it('should not return variants for a union of value types', () => {
  const schema = j.object<{ value: string | number }>({ value: j.anyOf([j.string(), j.number()]) })

  expect(generateMockVariantsFromSchema(schema)).toStrictEqual([{ value: { value: 'mock' } }])
})

it('should not share an example object between variants', () => {
  const schema = j.object<{ meta: { tag: string }; shape: { a: string } | { b: number } }>({
    meta: j.object<{ tag: string }>({ tag: j.string() }).example({ tag: 'x' }),
    shape,
  })

  const [first, second] = generateMockVariantsFromSchema(schema)

  expect(first!.value.meta).not.toBe(second!.value.meta)
})

it('should throw for a keyword it does not support, naming the field', () => {
  const schema = j.object<{ data: string }>({
    data: j.string().cloneAndUpdateSchema({ contentEncoding: 'base64' }),
  })

  expect(() => generateMockFromSchema(schema)).toThrow(
    'Cannot generate a value at data: the keyword contentEncoding is not supported',
  )
})

it('should throw for a string pattern without an example, naming the field', () => {
  const schema = j.object<{ inner: { code: string } }>({
    inner: j.object<{ code: string }>({ code: j.string().regex(/^\d{4}$/) }),
  })

  expect(() => generateMockFromSchema(schema)).toThrow(
    'Cannot generate a value at inner.code: a string with a pattern needs an example, .example(...)',
  )
})

it('should name the root in an error for a schema at the root', () => {
  const schema = j.string().regex(/^\d{4}$/)

  expect(() => generateMockFromSchema(schema)).toThrow(
    'Cannot generate a value at (root): a string with a pattern needs an example, .example(...)',
  )
})

it('should throw for a set that needs more than one item, naming the field', () => {
  const schema = j.object<{ tags: Set2<string> }>({ tags: j.set(j.string()).min(2) })

  expect(() => generateMockFromSchema(schema)).toThrow(
    'Cannot generate a value at tags: a list of 2 distinct items needs an example, .example([...])',
  )
})

it('should throw when no number satisfies the bounds, naming the field', () => {
  const schema = j.object<{ count: number }>({ count: j.number().integer().min(1.2).max(1.8) })

  expect(() => generateMockFromSchema(schema)).toThrow(
    'Cannot generate a value at count: no number satisfies the bounds of the schema',
  )
})

it('should throw for a map with a key pattern, naming the field', () => {
  const schema = j.object<{ readings: StringMap<number> }>({
    readings: j.object.withRegexKeys(/^k\d$/, j.number()),
  })

  expect(() => generateMockFromSchema(schema, { allFields: true })).toThrow(
    String.raw`Cannot generate a value at readings: a map with keys matching ^k\d$ needs an example, .example({...})`,
  )
})

it('should throw when the generated value does not pass the schema', () => {
  const schema = j.object<{ name: string }>({
    name: j.string().custom(value => (value === 'mock' ? 'is a placeholder' : undefined)),
  })

  expect(() => generateMockFromSchema(schema)).toThrow('is a placeholder')
})

it.each<{ label: string; schema: JSchema<any, any>; path: string }>([
  {
    label: 'an earlier anyOfThese branch accepts the value without a field',
    schema: j.object<{ shape: { id: string } | { id: string; extra: number } }>({
      shape: j.anyOfThese([
        j.object<{ id: string }>({ id: j.string() }),
        j.object<{ id: string; extra: number }>({ id: j.string(), extra: j.number() }),
      ]),
    }),
    path: 'shape.extra',
  },
  {
    label: 'the key example does not match the key schema',
    schema: j.object<{ scores: Record<string, number> }>({
      scores: j.object.record(
        j
          .string()
          .regex(/^[a-z]+$/)
          .example('KEY'),
        j.number(),
      ),
    }),
    path: 'scores.KEY',
  },
])('should throw when validation removes a generated value: $label', ({ schema, path }) => {
  expect(() => generateMockVariantsFromSchema(schema)).toThrow(
    `Cannot generate a value at ${path}: validation removed the generated value`,
  )
})

it('should throw when optionalValues would remove the generated value, naming the field', () => {
  const schema = j.object<{ count?: number }>({ count: j.number().optional([1]) })

  expect(() => generateMockFromSchema(schema, { allFields: true })).toThrow(
    'Cannot generate a value at count: the generated value 1 would be removed by optionalValues, give the field an example',
  )
})

it('should throw for a union with no branch that is not null, naming the field', () => {
  const schema = j.object<{ value: null }>({ value: j.anyOfThese([j.literal(null)]) })

  expect(() => generateMockFromSchema(schema)).toThrow(
    'Cannot generate a value at value: the union has no branch that is not null',
  )
})

it('should throw for a map that needs more than one key, naming the field', () => {
  const schema = j.object<{ scores: StringMap<number> }>({
    scores: j.object.stringMap(j.number()).minProperties(2),
  })

  expect(() => generateMockFromSchema(schema)).toThrow(
    'Cannot generate a value at scores: a map of 2 keys needs an example, .example({...})',
  )
})

it('should return a variant for each other property of a group of exclusive properties', () => {
  const schema = j.object<{ session: { sessionId?: string; pSessionId?: string } }>({
    session: j
      .object<{ sessionId?: string; pSessionId?: string }>({
        sessionId: j.string().optional(),
        pSessionId: j.string().optional(),
      })
      .exclusiveProperties(['sessionId', 'pSessionId']),
  })

  expect(generateMockVariantsFromSchema(schema)).toStrictEqual([
    { value: { session: { sessionId: 'mock' } } },
    {
      value: { session: { pSessionId: 'mock' } },
      choice: { path: 'session', option: 1, key: 'pSessionId' },
    },
  ])
})

it('should not return variants for a group of exclusive properties with a required property', () => {
  const schema = j
    .object<{ a?: string; b: string }>({ a: j.string().optional(), b: j.string() })
    .exclusiveProperties(['a', 'b'])

  expect(generateMockVariantsFromSchema(schema)).toStrictEqual([{ value: { b: 'mock' } }])
})

it('should find a number one step inside a one-sided exclusive bound', () => {
  const schema = j.object<{ above: number; below: number }>({
    above: j.number().exclusiveMin(2),
    below: j.number().exclusiveMax(0),
  })

  expect(generateMockFromSchema(schema)).toEqual({ above: 3, below: -1 })
})

it('should find an integer for an integer schema with a fractional step', () => {
  const schema = j.object<{ count: number }>({
    count: j.number().integer().min(1.2).multipleOf(0.5),
  })

  expect(generateMockFromSchema(schema)).toEqual({ count: 2 })
})

it('should not compare a value that postValidation changed with the generated one', () => {
  const schema = j
    .object<{ n: number }>({ n: j.number() })
    .postValidation(value => ({ renamed: value.n }))

  expect(generateMockFromSchema(schema)).toEqual({ renamed: 1 })
})

it('should throw when validation removes a field from an item of a set, naming the field', () => {
  const schema = j.object<{ shapes: Set2<{ id: string } | { id: string; extra: number }> }>({
    shapes: j.set(
      j.anyOfThese([
        j.object<{ id: string }>({ id: j.string() }),
        j.object<{ id: string; extra: number }>({ id: j.string(), extra: j.number() }),
      ]),
    ),
  })

  expect(() => generateMockVariantsFromSchema(schema)).toThrow(
    'Cannot generate a value at shapes.extra: validation removed the generated value',
  )
})

it('should pick the next free key for a map in an object with a field named key', () => {
  const schema = j
    .object<{ key: string; [name: string]: string }>({ key: j.string() })
    .cloneAndUpdateSchema({ additionalProperties: { type: 'string' } })

  expect(generateMockFromSchema(schema, { allFields: true })).toEqual({ key: 'mock', key1: 'mock' })
})

it('should throw when a key from the key schema is also a field of the object, naming the field', () => {
  const schema = j
    .object<{ key: string; [name: string]: string }>({ key: j.string() })
    .cloneAndUpdateSchema({
      keySchema: { type: 'string', examples: ['key'] },
      additionalProperties: { type: 'string' },
    })

  expect(() => generateMockFromSchema(schema, { allFields: true })).toThrow(
    'Cannot generate a value at key: the key schema gives the key "key", which is also a field of the object: give the key schema another example, or the map an example, .example({...})',
  )
})
