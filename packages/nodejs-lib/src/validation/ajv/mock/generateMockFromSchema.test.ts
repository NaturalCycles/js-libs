import { localTime } from '@naturalcycles/js-lib/datetime'
import { Set2 } from '@naturalcycles/js-lib/object'
import type { BaseDBEntity, StringMap, UnixTimestamp } from '@naturalcycles/js-lib/types'
import { expect, it } from 'vitest'
import type { JSchema } from '../jSchema.js'
import { j } from '../jSchema.js'
import { generateMockFromSchema } from './generateMockFromSchema.js'

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

it('should fill only the first field of a group of exclusive properties', () => {
  const schema = j
    .object<{ a?: string; b?: string }>({
      a: j.string().optional(),
      b: j.string().optional(),
    })
    .exclusiveProperties(['a', 'b'])

  expect(generateMockFromSchema(schema, { allFields: true })).toEqual({ a: 'mock' })
})

it('should throw for a string pattern without an example, naming the field', () => {
  const schema = j.object<{ inner: { code: string } }>({
    inner: j.object<{ code: string }>({ code: j.string().regex(/^\d{4}$/) }),
  })

  expect(() => generateMockFromSchema(schema)).toThrow(
    'The string at inner.code has a pattern and needs an example: .example(...)',
  )
})

it('should throw for a keyword it does not know, naming the field', () => {
  const schema = j.object<{ data: string }>({
    data: j.string().cloneAndUpdateSchema({ contentEncoding: 'base64' }),
  })

  expect(() => generateMockFromSchema(schema)).toThrow(
    'Cannot generate a value for the keyword contentEncoding at data',
  )
})

it('should throw when the generated value does not pass the schema', () => {
  const schema = j.object<{ name: string }>({
    name: j.string().custom(value => (value === 'mock' ? 'is a placeholder' : undefined)),
  })

  expect(() => generateMockFromSchema(schema)).toThrow('is a placeholder')
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

it('should generate a set at the root', () => {
  const schema = j.set(j.string()).min(1)

  expect(generateMockFromSchema(schema)).toStrictEqual(new Set2(['mock']))
})

it('should use a class instance given as an example', () => {
  const date = localTime.fromUnix(1_000_000_000 as UnixTimestamp).toDate()
  const schema = j.object<{ value: any }>({ value: j.any().instanceof('Date').example(date) })

  expect(generateMockFromSchema(schema).value).toBe(date)
})

it('should throw for a set that needs more than one item, naming the field', () => {
  const schema = j.object<{ tags: Set2<string> }>({ tags: j.set(j.string()).min(2) })

  expect(() => generateMockFromSchema(schema)).toThrow(
    'The list at tags needs 2 distinct items and needs an example: .example(...)',
  )
})

it('should throw when no number satisfies the bounds, naming the field', () => {
  const schema = j.object<{ count: number }>({ count: j.number().integer().min(1.2).max(1.8) })

  expect(() => generateMockFromSchema(schema)).toThrow(
    'No number at count satisfies the bounds of the schema',
  )
})

it('should throw for a map with a key pattern, naming the field', () => {
  const schema = j.object<{ readings: StringMap<number> }>({
    readings: j.object.withRegexKeys(/^k\d$/, j.number()),
  })

  expect(() => generateMockFromSchema(schema, { allFields: true })).toThrow(
    String.raw`The map at readings has keys with the pattern ^k\d$ and needs an example: .example({...})`,
  )
})

it('should name the root in an error for a schema at the root', () => {
  const schema = j.string().regex(/^\d{4}$/)

  expect(() => generateMockFromSchema(schema)).toThrow(
    'The string at (root) has a pattern and needs an example: .example(...)',
  )
})
