import { _try } from '@naturalcycles/js-lib/error'
import { _deepFreeze } from '@naturalcycles/js-lib/object'
import { expect, test } from 'vitest'
import { fs2 } from '../../fs/fs2.js'
import { _inspect } from '../../index.js'
import { testDir } from '../../test/paths.cnst.js'
import { AjvSchema } from './ajvSchema.js'
import { AjvValidationError } from './ajvValidationError.js'
import { j, type JsonSchema } from './jsonSchemaBuilder.js'

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
const schema = AjvSchema.create<any>(jsonSchemaSimple)

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

test('should mutate input by default', () => {
  const input = { s: 's', extra: 'abc' } as Simple
  const result = schema.validate(input)
  expect(input).toEqual({ s: 's' }) // input is mutated
  expect(result === input).toBe(true) // reference to the same object is returned
})

test('should not mutate input when instructed so', () => {
  const input = { s: 's', extra: 'abc' } as Simple
  _deepFreeze(input)
  const result = schema.validate(input, { mutateInput: false })
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
  expect(schema.validate(obj2, { mutateInput: false })).toEqual({ o: {} }) // Additional props are removed
  expect(obj2).toEqual({ o: { extra: 123 } }) // input object is not mutated
  schema.validate(obj2)
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
        transform: { trim: true, toLowerCase: true },
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
  const rawSchema = j
    .object({
      id: j.string(),
    })
    .isOfType<{ id: string }>()

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
    type: 'object',
  })
  schema.validate(Buffer.from('abc'), { mutateInput: true })

  expect(schema.isValid('a b c' as any)).toBe(false)
})
