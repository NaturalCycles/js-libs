import { _range } from '@naturalcycles/js-lib/array/range.js'
import { describe, expect, it } from 'vitest'
import {
  mockStringId,
  stringId,
  stringIdBase62,
  stringIdBase64,
  stringIdBase64Url,
  stringIdNonAmbiguous,
  unmockStringId,
} from '../index.js'
import { j } from '../validation/ajv/jSchema.js'
import type { JSchema } from '../validation/ajv/jSchema.js'
import { BASE62_REGEX, BASE64_REGEX, BASE64URL_REGEX } from '../validation/regexes.js'

const stringIdRegex = /^[a-z0-9]*$/
const base62regex = /^[a-zA-Z0-9]*$/
const base64regex = /^[a-zA-Z0-9+/]*$/
const base64urlRegex = /^[a-zA-Z0-9-_]*$/
const nonAmbiguousRegex = /^[2-9A-HJ-NP-Z]+$/

const base62Schema = j.string().regex(BASE62_REGEX)
const idBase62Schema = j.string().regex(BASE62_REGEX).minLength(8)
const base64Schema = j.string().regex(BASE64_REGEX)
const idBase64Schema = j.string().regex(BASE64_REGEX).minLength(8)
const base64UrlSchema = j.string().regex(BASE64URL_REGEX)
const idBase64UrlSchema = j.string().regex(BASE64URL_REGEX).minLength(8)

function validate(value: string, schema: JSchema<string, any>): void {
  schema.validate(value)
}

it('should generate lowercase alphanumeric ids of 16 characters or the given size', () => {
  const id = stringId()
  expect(id).toHaveLength(16)
  expect(id.toLowerCase()).toBe(id)

  expect(stringId(32)).toHaveLength(32)

  _range(100).forEach(() => {
    expect(stringId()).toMatch(stringIdRegex)
  })
})

it('should return the mocked id until unmockStringId is called', () => {
  mockStringId('abc')
  expect(stringId()).toBe('abc')
  expect(stringId()).toBe('abc')
  unmockStringId()
  expect(stringId()).not.toBe('abc')
  expect(stringId()).toHaveLength(16)
})

it('should generate 16-character base62 ids', () => {
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

it('should generate base64 and base64url ids of the given length, 16 by default', () => {
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

it('should generate base64url ids without padding for odd lengths', () => {
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
  it('should generate 16 characters by default, or the given size, without 0, 1, I, O or lowercase letters', () => {
    expect(stringIdNonAmbiguous()).toHaveLength(16)
    expect(stringIdNonAmbiguous(100)).toHaveLength(100)

    _range(100).forEach(() => {
      expect(stringIdNonAmbiguous()).toMatch(nonAmbiguousRegex)
      expect(stringIdNonAmbiguous(100)).toMatch(nonAmbiguousRegex)
    })
  })
})
