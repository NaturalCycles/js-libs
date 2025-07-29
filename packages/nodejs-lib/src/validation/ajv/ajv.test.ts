import { localTime } from '@naturalcycles/js-lib/datetime/localTime.js'
import { _try } from '@naturalcycles/js-lib/error'
import type { JsonSchema } from '@naturalcycles/js-lib/json-schema'
import { jsonSchema } from '@naturalcycles/js-lib/json-schema'
import { _deepFreeze } from '@naturalcycles/js-lib/object'
import type { IsoDate } from '@naturalcycles/js-lib/types'
import { expect, test } from 'vitest'
import { fs2 } from '../../fs/fs2.js'
import { _inspect } from '../../index.js'
import { testDir } from '../../test/paths.cnst.js'
import { AjvSchema } from './ajvSchema.js'
import { AjvValidationError } from './ajvValidationError.js'

interface Simple {
  s: string
  int?: number
}

interface TestType {
  s: string
  n: null
  s2: string | null
}

const jsonSchemaSimple = fs2.readJson<JsonSchema<Simple>>(`${testDir}/schema/simple.schema.json`)
const schema = AjvSchema.create(jsonSchemaSimple)

test('simple', () => {
  // Valid
  const valid: Simple = { s: 's' }
  schema.validate(valid)
  schema.validate({ s: '' })
  schema.validate({ s: 's', int: 5 })
  expect(schema.isValid(valid)).toBe(true)
  expect(schema.getValidationResult(valid)[0]).toBeNull()

  // Should remove additonal
  const a = { s: 's', extra: 1 }
  schema.validate(a, { mutateInput: true })
  expect(a).toEqual({ s: 's' }) // extra removed, no error

  // Error, required property
  const missing = {} as Simple
  expect(schema.isValid(missing)).toBe(false)
  expect(() => schema.validate(missing)).toThrowErrorMatchingInlineSnapshot(`
    [AjvValidationError: simple must have required property 's'
    Input: {}]
  `)

  const [err] = _try(() => schema.validate(missing), AjvValidationError)
  expect(err).toBeInstanceOf(AjvValidationError)
  expect(err!.data).toMatchInlineSnapshot(`
    {
      "errors": [
        {
          "instancePath": "",
          "keyword": "required",
          "message": "must have required property 's'",
          "params": {
            "missingProperty": "s",
          },
          "schemaPath": "#/required",
        },
      ],
      "inputName": "simple",
    }
  `)

  // Object name, id from options
  expect(() => schema.validate(missing, { inputName: 'Simple', inputId: 'id1' }))
    .toThrowErrorMatchingInlineSnapshot(`
      [AjvValidationError: Simple.id1 must have required property 's'
      Input: {}]
    `)

  // Object name without id from options
  expect(() => schema.validate(missing, { inputName: 'Simple' }))
    .toThrowErrorMatchingInlineSnapshot(`
      [AjvValidationError: Simple must have required property 's'
      Input: {}]
    `)

  // Object id from object
  expect(() => schema.validate({ id: 'id2' } as any)).toThrowErrorMatchingInlineSnapshot(`
    [AjvValidationError: simple.id2 must have required property 's'
    Input: { id: 'id2' }]
  `)
})

test('should not mutate input by default', () => {
  const input = { s: 's', extra: 'abc' } as Simple
  _deepFreeze(input)
  const result = schema.validate(input)
  expect(result).toEqual({ s: 's' }) // extra removed
  expect(input).toEqual({ s: 's', extra: 'abc' }) // input is not mutated
  expect(result !== input).toBe(true) // different object is returned
})

test('TestType', () => {
  const jsonSchemaTest = fs2.readJson<JsonSchema<TestType>>(
    `${testDir}/schema/TestType.schema.json`,
  )
  const schema = AjvSchema.create(jsonSchemaTest)

  // Valid
  const valid: TestType = {
    s: 's',
    n: null,
    s2: 's2',
  }
  const valid2: TestType = {
    s: 's',
    n: null,
    s2: null,
  }

  schema.validate(valid)
  schema.validate(valid2)

  const invalid1 = {
    s: 's',
  } as TestType
  expect(() => schema.validate(invalid1)).toThrowErrorMatchingInlineSnapshot(`
    [AjvValidationError: TestType must have required property 'n'
    TestType must have required property 's2'
    Input: { s: 's' }]
  `)

  const invalid2 = {
    s: 's',
    n: null,
  } as TestType
  expect(() => schema.validate(invalid2)).toThrowErrorMatchingInlineSnapshot(`
    [AjvValidationError: TestType must have required property 's2'
    Input: { s: 's', n: null }]
  `)
})

// todo:
// email TLD! (as in Joi)
// url format (require https?)

test.each([
  [{ type: 'string' }, ['', 'lo']],
  [{ type: 'string', format: 'email' }, ['a@b.com']],
  [{ type: 'string', format: 'date' }, ['1984-06-21']], // exactly same as our IsoDate
  [{ type: 'string', format: 'url' }, ['http://ya.ru']],
  [{ type: 'string', format: 'ipv4' }, ['1.1.1.1']],
  [{ type: 'string', format: 'regex' }, ['abc', '^abc$']],
  [{ type: 'string', format: 'uuid' }, ['123e4567-e89b-12d3-a456-426614174000']],
  [{ type: 'string', format: 'byte' }, ['aGVsbG8gd29ybGQ=']],
  [{ type: 'string', format: 'binary' }, ['any string']],
  [{ instanceof: 'Buffer' }, [Buffer.from('a b c'), Buffer.alloc(1)]],
  [{ type: 'string', format: 'password' }, ['any string']],
  [{ type: 'number' }, [1, -5, 1059]],
  [{ type: 'integer' }, [1, -5, 1059]],
  [{ type: 'number', format: 'int32' }, [1, 1059]],
  [{ type: 'number', format: 'int64' }, [1, 1059]],
  [{ type: 'number', format: 'float' }, [1.1]],
  [{ type: 'number', format: 'double' }, [1.1]],
  // custom
  [{ type: 'string', format: 'id' }, ['abcd12']],
  [{ type: 'string', format: 'slug' }, ['hello-world']],
  [{ type: 'string', format: 'semVer' }, ['1.2.30']],
  [{ type: 'string', format: 'languageTag' }, ['en', 'en-US', 'sv-SE']],
  [{ type: 'string', format: 'countryCode' }, ['SE', 'US']],
  [{ type: 'string', format: 'currency' }, ['SEK', 'USD']],
  [{ type: 'number', format: 'unixTimestamp' }, [1232342342]],
  [{ type: 'number', format: 'unixTimestamp2000' }, [1232342342]],
  [{ type: 'number', format: 'unixTimestampMillis' }, [1232342342 * 1000]],
  [{ type: 'number', format: 'unixTimestampMillis2000' }, [1232342342 * 1000]],
  [{ type: 'number', format: 'utcOffset' }, [-14 * 60, -12 * 60, 0, 12 * 60, 14 * 60]],
  [{ type: 'number', format: 'utcOffsetHours' }, [-14, -12, 0, 12, 14]],
] as [JsonSchema, any[]][])('%s should be valid', (schema, objects: any[]) => {
  const ajvSchema = AjvSchema.create(schema)
  objects.forEach(obj => {
    // should not throw
    ajvSchema.validate(obj, { mutateInput: true })
  })
})

test.each([
  [{ type: 'string' }, [undefined, null, 4, () => {}, NaN]],
  [{ type: 'string', format: 'email' }, ['', 'lo', 'a@b', 'a@b.com.']],
  [{ type: 'string', format: 'date' }, ['1984-06-2', '1984-6-21', '1984-06-21T']],
  [{ type: 'string', format: 'url' }, ['http://ya.r', 'ya.ru', 'abc://a.ru']],
  [{ type: 'string', format: 'ipv4' }, ['1.1.1.']],
  [{ type: 'string', format: 'regex' }, ['[', '[]++']],
  [{ type: 'string', format: 'uuid' }, ['123e4567-e89b-12d3-a456-4266141740']],
  [{ type: 'string', format: 'byte' }, ['123']],
  [{ instanceof: 'Buffer' }, ['not a buffer', 1, {}, [], null, () => {}]],
  [{ type: 'number' }, ['1']],
  [{ type: 'integer' }, [1.1]],
  [{ type: 'number', format: 'int32' }, [Number.MAX_VALUE, 1.1]],
  [{ type: 'number', format: 'float' }, [Number.POSITIVE_INFINITY]],
  [{ type: 'number', format: 'double' }, [Number.NaN]],
  // custom
  [{ type: 'string', format: 'id' }, ['short', 's'.repeat(65), 'Aasdasasd']],
  [{ type: 'string', format: 'slug' }, ['hello_world']],
  [{ type: 'string', format: 'semVer' }, ['1.2']],
  [{ type: 'string', format: 'languageTag' }, ['en-U', 'en_US', 'sv_SE']],
  [{ type: 'string', format: 'countryCode' }, ['se', 'sve']],
  [{ type: 'string', format: 'currency' }, ['sek', 'us']],
  [{ type: 'number', format: 'unixTimestamp' }, [1232342342000, -1]],
  [
    { type: 'number', format: 'unixTimestamp2000' },
    [1232342342000, localTime('1999-01-01' as IsoDate).unix],
  ],
  [{ type: 'number', format: 'unixTimestampMillis' }, [-1]],
  [
    { type: 'number', format: 'unixTimestampMillis2000' },
    [-1, localTime('1999-01-01' as IsoDate).unixMillis],
  ],
  [{ type: 'number', format: 'utcOffset' }, [-15 * 60]],
  [{ type: 'number', format: 'utcOffsetHours' }, [-15, 15]],
] as [JsonSchema, any[]][])('%s should be invalid', (schema, objects: any[]) => {
  const ajvSchema = AjvSchema.create(schema)
  objects.forEach(obj => {
    if (ajvSchema.isValid(obj)) {
      console.log(obj, 'should be invalid for schema:', schema)
      throw new Error(`${_inspect(obj)} should be invalid for ${_inspect(schema)}`)
    }
  })
})

test('default string', () => {
  const schema = AjvSchema.create({
    type: 'object',
    properties: {
      s: {
        type: 'string',
        default: 'def',
      },
    },
  } as JsonSchema)

  const obj1 = { s: 's' }
  _deepFreeze(obj1)
  schema.validate(obj1)

  const obj2 = {}
  schema.validate(obj2, { mutateInput: true })
  expect(obj2).toEqual({ s: 'def' })
})

test('default object', () => {
  const schema = AjvSchema.create({
    type: 'object',
    properties: {
      o: {
        type: 'object',
        properties: {
          hello: { type: 'string' },
          also: {},
        },
        default: { hello: 'world', also: { n: 1 } },
        additionalProperties: false,
      },
    },
  } as JsonSchema)

  const obj1 = { o: {} }
  _deepFreeze(obj1)
  schema.validate(obj1)

  const obj2 = { o: { extra: 123 } }
  expect(schema.validate(obj2)).toEqual({ o: {} }) // Additional props are removed
  expect(obj2).toEqual({ o: { extra: 123 } }) // input object is not mutated
  schema.validate(obj2, { mutateInput: true })
  expect(obj2).toEqual({ o: {} })

  const obj3 = {}
  schema.validate(obj3, { mutateInput: true })
  expect(obj3).toEqual({ o: { hello: 'world', also: { n: 1 } } })
})

test('transform string', () => {
  const schema = AjvSchema.create({
    type: 'object',
    properties: {
      s: {
        type: 'string',
        transform: ['trim', 'toLowerCase'],
      },
    },
  } as JsonSchema)

  const obj1 = { s: 's' }
  _deepFreeze(obj1)
  schema.validate(obj1)

  const obj2 = { s: '   lo Lo lO' }
  schema.validate(obj2, { mutateInput: true })
  expect(obj2).toEqual({ s: 'lo lo lo' })
})

test('inputName', () => {
  const s = AjvSchema.create(
    {},
    {
      inputName: 'body',
    },
  )
  expect(s.cfg.inputName).toBe('body')
})

interface Item {
  id: string
}

test('types', () => {
  const rawSchema = jsonSchema.object<Item>({
    id: jsonSchema.string(),
  })

  // Type of ajvSchema must be AjvSchema<Item> (not AjvSchema<any> !)
  // todo: make it work without explicit <Item>
  const ajvSchema = AjvSchema.create<Item>(rawSchema)

  // Let's assert it by using

  const item = ajvSchema.validate({ id: 'yay' })
  expect(item).toEqual({ id: 'yay' })
})

test('buffer', () => {
  const schema = AjvSchema.create({
    instanceof: 'Buffer',
  })
  schema.validate(Buffer.from('abc'), { mutateInput: true })

  expect(schema.isValid('a b c' as any)).toBe(false)
})
