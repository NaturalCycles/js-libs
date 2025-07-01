import { _range } from '@naturalcycles/js-lib'
import { describe, expect, test } from 'vitest'
import {
  stringId,
  stringIdBase62,
  stringIdBase64,
  stringIdBase64Url,
  stringIdNonAmbiguous,
} from '../index.js'
import {
  base62Schema,
  base64Schema,
  base64UrlSchema,
  idBase62Schema,
  idBase64Schema,
  idBase64UrlSchema,
  validate,
} from '../validation/joi/index.js'

const stringIdRegex = /^[a-z0-9]*$/
const base62regex = /^[a-zA-Z0-9]*$/
const base64regex = /^[a-zA-Z0-9+/]*$/
const base64urlRegex = /^[a-zA-Z0-9-_]*$/

test('stringId', () => {
  const id = stringId()
  expect(id).toHaveLength(16)
  expect(id.toLowerCase()).toBe(id)

  expect(stringId(32)).toHaveLength(32)

  _range(100).forEach(() => {
    expect(stringId()).toMatch(stringIdRegex)
  })
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
