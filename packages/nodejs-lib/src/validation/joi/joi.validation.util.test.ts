import { _stringify } from '@naturalcycles/js-lib/string'
import type { AnyObject } from '@naturalcycles/js-lib/types'
import { expect, test } from 'vitest'
import { testValidation } from '../../test/validation.test.util.js'
import { Joi } from './joi.extensions.js'
import {
  arraySchema,
  booleanDefaultToFalseSchema,
  booleanSchema,
  emailSchema,
  integerSchema,
  numberSchema,
  objectSchema,
  stringSchema,
} from './joi.shared.schemas.js'
import { JoiValidationError } from './joi.validation.error.js'
import {
  convert,
  getValidationResult,
  isValid,
  undefinedIfInvalid,
  validate,
} from './joi.validation.util.js'

class Obj1 {
  a1!: string
  a2?: string
}

const obj1Schema = objectSchema<Obj1>({
  a1: stringSchema.min(2).max(5),
  a2: stringSchema.min(2).optional(),
})

interface Obj2 {
  s1?: string
  a: Obj1[]
}

const obj2Schema = objectSchema<Obj2>({
  s1: stringSchema.optional(),
  a: arraySchema<Obj1>(obj1Schema),
})

const invalidValues: any[] = [
  undefined,
  null,
  '',
  'abc',
  5,
  () => 'a',
  { a1: 'a' },
  { a1: 'a12345' },
]

const validValues: any[] = [
  {
    a1: 'ff',
  },
  {
    a1: 'ff',
    a2: 'sdfer',
  },
]

test('should fail on invalid values', () => {
  invalidValues.forEach(v => {
    expect(() => validate(v, obj1Schema)).toThrowErrorMatchingSnapshot()
  })
})

test('should pass on valid values', () => {
  validValues.forEach(v => {
    validate(v, obj1Schema)
  })
})

test('should trim strings by default', async () => {
  const v = { a1: ' sdf ' }
  const v2 = validate(v, obj1Schema)

  expect(v2.a1).toBe('sdf')
  expect(v === v2).toBe(false) // object should be cloned
})

test('should strip unknown keys', async () => {
  const v: AnyObject = {
    a1: 'ff',
    unk: 'ddd',
  }
  const v2 = validate(v, obj1Schema)

  expect(v2).toEqual({ a1: 'ff' })
  expect((v2 as any)['unk']).toBeUndefined()
})

test('getValidationResult should still convert', async () => {
  const v = {
    a1: ' ff ', // to be converted
    a2: 'a', // invalid!
  }
  const vr = getValidationResult(v, obj1Schema, 'objName')
  expect(vr.value.a1).toBe('ff')
  expect(vr.error).toBeInstanceOf(JoiValidationError)
  expect(vr.error).toMatchSnapshot()
})

test('getValidationResult valid', async () => {
  const vr = getValidationResult('asd', stringSchema)
  expect(vr.error).toBeUndefined()
})

test('error should contain errorItems', async () => {
  const v = {
    a1: ' ff ', // to be converted
    a2: 'a', // invalid!
  }
  const { error } = getValidationResult(v, obj1Schema, 'objName')
  expect(error!.data).toMatchSnapshot()
})

test('array items with unknown props', async () => {
  const v: Obj2 = {
    a: [
      {
        a1: 'hello',
        unk: 'unk', // unknown property!
      } as Obj1,
    ],
  }

  const { value, error } = getValidationResult(v, obj2Schema)
  // console.log(value)
  expect(error).toBeUndefined()

  // Expect 'unk' to be stripped away, no validation error
  expect(value).toEqual({
    a: [{ a1: 'hello' }],
  })
})

test('array with invalid items', async () => {
  const v: Obj2 = {
    a: [
      {
        a1: 'hello',
      } as Obj1,
      '' as any, // invalid value
    ],
  }

  const { error } = getValidationResult(v, obj2Schema)
  // console.log(value)
  expect(error!.data).toMatchSnapshot()
})

test('array items with invalid props', async () => {
  const v: Obj2 = {
    a: [
      {
        a1: 5, // invalid type
      } as any,
    ],
  }

  const { error } = getValidationResult(v, obj2Schema)
  expect(error!.data).toMatchSnapshot()
})

// optional
// default values

test('long message string', () => {
  const objSchema = arraySchema<Obj1>(obj1Schema)

  const longObject = Array.from({ length: 1000 }).fill({ a1: 5 })

  const { error } = getValidationResult(longObject, objSchema)
  // console.log(error!.message, error!.message.length)
  expect(error!.message).toMatchSnapshot()
})

test('should include id in the error message', () => {
  const obj = {
    id: 'someId',
  }

  const obj1 = Object.assign(new Obj1(), {
    id: 'someId',
  })

  // No objectName, with id
  let { error } = getValidationResult(obj as any, obj1Schema)
  // console.log(error)
  expect(error!.message).toMatchSnapshot()
  expect(error!.data).toMatchSnapshot()

  // ObjectName, with id
  ;({ error } = getValidationResult(obj as any, obj1Schema, 'ObjName'))
  // console.log(error)
  expect(error!.message).toMatchSnapshot()
  expect(error!.data).toMatchSnapshot()

  // No objectName, with id, constructor name
  ;({ error } = getValidationResult(obj1, obj1Schema))
  // console.log(error)
  expect(error!.message).toMatchSnapshot()
  expect(error!.data).toMatchSnapshot()
})

test('should return value on undefined schema', () => {
  const obj = {
    id: 'someId',
  }

  expect(validate(obj)).toBe(obj)
  const { value, error } = getValidationResult(obj)
  expect(value).toBe(obj)
  expect(error).toBeUndefined()
})

test('should convert empty string to undefined and strip', () => {
  const schema = objectSchema<Obj1>({
    a1: stringSchema.optional(),
    a2: stringSchema.optional(),
  })

  const obj1: Obj1 = {
    a1: 'asd ',
    a2: '',
  }

  const obj1mod = validate(obj1, schema)
  // console.log(obj1mod)
  expect(obj1mod).toEqual({
    a1: 'asd',
  })
})

test('empty string is not valid stringSchema', () => {
  expect(isValid('', stringSchema)).toBe(false)
})

test('should convert null to undefined and strip', () => {
  const schema = objectSchema<Obj1>({
    a1: stringSchema.optional(),
    // this is how `null` can be accepted (as empty):
    a2: stringSchema.empty(null).optional(),
  })

  const obj1: Obj1 = {
    a1: 'asd ',
    a2: null as any,
  }

  const obj1mod = validate(obj1, schema)
  // console.log(obj1mod)
  expect(obj1mod).toEqual({
    a1: 'asd',
  })

  // undefined is fine (empty, optional)
  expect(validate(undefined, booleanSchema.optional())).toBeUndefined()
  expect(validate(undefined, numberSchema.optional())).toBeUndefined()

  // null is invalid
  expect(isValid(null, numberSchema.optional())).toBe(false)
  expect(isValid(null, integerSchema.optional())).toBe(false)
  expect(isValid(null, arraySchema().optional())).toBe(false)

  // this is how to make null valid
  const numberPermissiveSchema = numberSchema.empty(null).optional()
  expect(isValid(null, numberPermissiveSchema)).toBe(true)
  expect(isValid(undefined, numberPermissiveSchema)).toBe(true)
  expect(isValid(5.1, numberPermissiveSchema)).toBe(true)
})

test('null is not a valid value when required', () => {
  testValidation(stringSchema, ['a'], ['', null, undefined, 5])
  testValidation(numberSchema, [5, 0], ['', null, undefined, 'a'])
  testValidation(
    booleanSchema,
    [true, false, 'true', 'false'],
    ['', null, undefined, 'a', 'tr', 'fa', 0, -1],
  )
})

test('default to empty array', () => {
  expect(validate(undefined, arraySchema().optional())).toBeUndefined()
  expect(validate(undefined, arraySchema().optional().default([]))).toEqual([])
  // expect(validate(null, arraySchema().optional().default([]))).toEqual([])
})

// Checking that partial schema is allowed (not all keys of Obj1 are required)
const _partialSchema = objectSchema<Obj1>({
  a2: stringSchema,
})

test('isValid', () => {
  expect(isValid('asd', stringSchema)).toBe(true)
  expect(isValid(56 as any, stringSchema)).toBe(false)
})

test('undefinedIfInvalid', () => {
  expect(undefinedIfInvalid('asd', stringSchema)).toBe('asd')
  expect(undefinedIfInvalid(56 as any, stringSchema)).toBeUndefined()
})

test('convert', () => {
  expect(convert(undefined)).toBeUndefined()
  expect(convert(undefined, stringSchema)).toBeUndefined()
  expect(convert('', stringSchema)).toBeUndefined()
  expect(convert('', stringSchema.optional())).toBeUndefined()
  expect(convert('a', stringSchema)).toBe('a')
  expect(convert(' a', stringSchema)).toBe('a')
  expect(convert(' a b  ', stringSchema)).toBe('a b')
})

test('booleanDefaultToFalseSchema', () => {
  const s = booleanDefaultToFalseSchema
  expect(convert(undefined, s)).toBe(false)
  expect(convert(false, s)).toBe(false)
  expect(convert(true, s)).toBe(true)
})

// todo
test.skip('arraySchema should strip undefined/null values by default', () => {
  // const schema = arraySchema(stringSchema)
  const schema = Joi.array().sparse(true).items(stringSchema.optional())

  expect(validate(['s', undefined, 's2', null], schema)).toEqual(['s', 's2'])
})

test('annotation is non-enumerable, but still accessible', () => {
  const s = booleanSchema
  const { error } = getValidationResult('notBoolean' as any, s)
  expect(error).toBeInstanceOf(JoiValidationError)

  expect(error!.data).toMatchInlineSnapshot(`
    {
      "joiValidationErrorItems": [
        {
          "context": {
            "label": "value",
            "value": "notBoolean",
          },
          "message": ""value" must be a boolean",
          "path": [],
          "type": "boolean.base",
        },
      ],
    }
  `)

  expect(JSON.stringify(error!.data)).not.toContain('annotation')

  // But it's still present!
  expect(error!.data.annotation).toMatchInlineSnapshot(`""value" must be a boolean"`)
  expect(!!error!.data.annotation).toBe(true)
})

test('formatting of email error', () => {
  const obj = {
    name1: 'Vasya',
    name2: 'Pupkeen',
    email: 'la@gmail.con',
  }

  const schema = objectSchema({
    name1: stringSchema,
    name2: stringSchema,
    email: emailSchema,
  })

  const { error } = getValidationResult(obj, schema)
  expect(_stringify(error)).toMatchInlineSnapshot(`
    "JoiValidationError: "email" must be a valid email

    {
      "name1": "Vasya",
      "name2": "Pupkeen",
      "email" [1]: "la@gmail.con"
    }

    [1] "email" must be a valid email"
  `)
})

test('should not mutate the input', () => {
  interface Obj {
    s: string
  }

  const schema = objectSchema<Obj>({
    // transforms by truncating the string
    s: stringSchema.max(3).truncate(),
  })

  const obj: Obj = {
    s: '12345678',
  }

  const { value, error } = getValidationResult(obj, schema)
  expect(error).toBeUndefined()
  expect(value).toEqual({ s: '123' }) // truncated
  expect(obj.s, 'should not mutate').toBe('12345678')
  expect(value === obj).toBe(false) // should not reference the same object
})
