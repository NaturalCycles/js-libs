import { _range } from '@naturalcycles/js-lib/array/range.js'
import { describe, expect, test } from 'vitest'
import {
  mockStringId,
  stringId,
  stringIdBase62,
  stringIdBase64,
  stringIdBase64Url,
  stringIdNonAmbiguous,
  unmockStringId,
} from '../index.js'
import { AjvSchema } from '../validation/ajv/ajvSchema.js'
import { j } from '../validation/ajv/jsonSchemaBuilder.js'
import { BASE62_REGEX, BASE64_REGEX, BASE64URL_REGEX } from '../validation/regexes.js'

const stringIdRegex = /^[a-z0-9]*$/
const base62regex = /^[a-zA-Z0-9]*$/
const base64regex = /^[a-zA-Z0-9+/]*$/
const base64urlRegex = /^[a-zA-Z0-9-_]*$/

const base62Schema = AjvSchema.create(j.string().regex(BASE62_REGEX).build())
const idBase62Schema = AjvSchema.create(j.string().regex(BASE62_REGEX).minLength(8).build())
const base64Schema = AjvSchema.create(j.string().regex(BASE64_REGEX).build())
const idBase64Schema = AjvSchema.create(j.string().regex(BASE64_REGEX).minLength(8).build())
const base64UrlSchema = AjvSchema.create(j.string().regex(BASE64URL_REGEX).build())
const idBase64UrlSchema = AjvSchema.create(j.string().regex(BASE64URL_REGEX).minLength(8).build())

function validate(value: string, schema: AjvSchema<string>): void {
  schema.validate(value)
}

test('stringId', () => {
  const id = stringId()
  expect(id).toHaveLength(16)
  expect(id.toLowerCase()).toBe(id)

  expect(stringId(32)).toHaveLength(32)

  _range(100).forEach(() => {
    expect(stringId()).toMatch(stringIdRegex)
  })
})

test('stringId mocked', () => {
  mockStringId('abc')
  expect(stringId()).toBe('abc')
  expect(stringId()).toBe('abc')
  unmockStringId()
  expect(stringId()).not.toBe('abc')
  expect(stringId()).toHaveLength(16)
})

test('stringIdBase62', () => {
  const id = stringIdBase62()
  expect(id).toHaveLength(16)
  expect(id).not.toContain('=')
  expect(id).not.toContain('-')
  expect(id).not.toContain('_')
  expect(id).not.toContain('/')
  expect(id).not.toContain('+')

  _range(100).forEach(() => {
    const id = stringIdBase62()
    expect(id).toMatch(base62regex)
    validate(id, base62Schema)
    validate(id, idBase62Schema)
  })
})

test('stringIdBase64', () => {
  const id = stringIdBase64()
  expect(id).toHaveLength(16) // default

  const id2 = stringIdBase64Url()
  expect(id2).toHaveLength(16) // default

  const lengths = [4, 8, 12, 16, 32]

  lengths.forEach(len => {
    _range(100).forEach(() => {
      const id = stringIdBase64(len)
      // console.log(id, id.length)
      expect(id).toHaveLength(len)
      expect(id).toMatch(base64regex)
      validate(id, base64Schema)
      if (len >= 8) {
        validate(id, idBase64Schema)
      }

      const id2 = stringIdBase64Url(len)
      // console.log(id2, id2.length)
      expect(id2).toHaveLength(len)
      expect(id2).toMatch(base64urlRegex)
      validate(id2, base64UrlSchema)

      if (len >= 8) {
        validate(id2, idBase64UrlSchema)
      }
    })
  })
})

test('stringIdBase64Url should have no padding', () => {
  // intentionally using odd sizes
  const lengths = [3, 7, 9, 11, 13]

  lengths.forEach(len => {
    _range(100).forEach(() => {
      const id = stringIdBase64Url(len)
      expect(id).toMatch(base64urlRegex)
    })
  })
})

describe('stringIdNonAmbiguous', () => {
  test('default size', () => {
    const id = stringIdNonAmbiguous()
    expect(id).toHaveLength(16)
    expect(id).not.toContain('0')
    expect(id).not.toContain('O')
    expect(id).not.toContain('I')
    expect(id).not.toContain('l')
  })

  test('custom size', () => {
    const id = stringIdNonAmbiguous(100)
    expect(id).toHaveLength(100)
    expect(id).not.toContain('0')
    expect(id).not.toContain('O')
    expect(id).not.toContain('1')
    expect(id).not.toContain('I')
    expect(id).not.toContain('l')
  })
})
