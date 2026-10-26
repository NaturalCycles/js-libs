import { expect, it } from 'vitest'
import { TEST_ENC_KEY } from '../test/test.cnst.js'
import {
  decryptObject,
  decryptRandomIVBuffer,
  decryptString,
  encryptObject,
  encryptRandomIVBuffer,
  encryptString,
  timingSafeStringEqual,
} from './crypto.util.js'

const encKeyBuffer = Buffer.from(TEST_ENC_KEY, 'base64')

it('testEncKeySize', () => {
  expect(encKeyBuffer).toHaveLength(256)
})

it('encryptBuffer, decryptBuffer', () => {
  const plainStr = 'hello!@#123'
  const plain = Buffer.from(plainStr, 'utf8')
  const enc = encryptRandomIVBuffer(plain, encKeyBuffer)
  const dec = decryptRandomIVBuffer(enc, encKeyBuffer)
  const decStr = dec.toString('utf8')
  expect(dec).toStrictEqual(plain)
  expect(decStr).toBe(plainStr)
})

it('encryptBuffer should not be deterministic', () => {
  const plainStr = 'hello!@#123'
  const plain = Buffer.from(plainStr, 'utf8')
  const enc1 = encryptRandomIVBuffer(plain, encKeyBuffer)
  const enc2 = encryptRandomIVBuffer(plain, encKeyBuffer)
  expect(enc1).not.toStrictEqual(enc2)
})

it('encryptString, decryptString', () => {
  const plain = 'hello!@#123'
  const enc = encryptString(plain, encKeyBuffer)
  const dec = decryptString(enc, encKeyBuffer)
  expect(dec).toStrictEqual(plain)
})

it('encryptString should be deterministic', () => {
  const plain = 'hello!@#123'
  const enc1 = encryptString(plain, encKeyBuffer)
  const enc2 = encryptString(plain, encKeyBuffer)
  expect(enc2).toBe(enc1)
})

it('encryptObject, decryptObject', () => {
  const obj1 = {
    a: 'aaa',
    b: 'bbb',
  }

  const enc = encryptObject(obj1, encKeyBuffer)
  const obj2 = decryptObject(enc, encKeyBuffer)
  expect(obj2).toEqual(obj1)
  expect(obj2 === obj1).toBe(false)

  expect(enc).toMatchInlineSnapshot(`
    {
      "a": "Z0/b6KRhob1dn7128Nu7UQ==",
      "b": "Bg13TAXhqGoKZhZznomdWA==",
    }
  `)

  // Should be deterministic:
  expect(encryptObject(obj1, encKeyBuffer)).toEqual(enc)
})

it('timingSafeStringEquals', () => {
  const pw = 'hello!@#123'

  expect(timingSafeStringEqual(undefined, pw)).toBe(false)
  expect(timingSafeStringEqual('', pw)).toBe(false)
  expect(timingSafeStringEqual('', '')).toBe(true)
  expect(timingSafeStringEqual('abc', 'abc')).toBe(true)
  expect(timingSafeStringEqual('abc', 'abd')).toBe(false)
  expect(timingSafeStringEqual(pw, pw)).toBe(true)
  expect(timingSafeStringEqual(pw, undefined)).toBe(false)
})
