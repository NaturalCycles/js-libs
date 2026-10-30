import { expect, it } from 'vitest'
import {
  base64,
  base64ToBuffer,
  base64ToString,
  base64Url,
  bufferToBase64,
  bufferToBase64Url,
  md5,
  md5AsBuffer,
  sha256,
  sha256AsBuffer,
  stringToBase64,
} from './hash.util.js'

it('should hash md5 as hex, base64, base64url and a buffer', () => {
  const plain = 'hello!@#123'
  expect(md5(plain)).toMatchInlineSnapshot(`"41f871086829ceb41c02d2f99e11ddd0"`)
  expect(md5(plain, 'base64')).toMatchInlineSnapshot(`"QfhxCGgpzrQcAtL5nhHd0A=="`)
  expect(md5(plain, 'base64url')).toMatchInlineSnapshot(`"QfhxCGgpzrQcAtL5nhHd0A"`)
  expect(md5AsBuffer(plain)).toMatchInlineSnapshot(`
    {
      "data": [
        65,
        248,
        113,
        8,
        104,
        41,
        206,
        180,
        28,
        2,
        210,
        249,
        158,
        17,
        221,
        208,
      ],
      "type": "Buffer",
    }
  `)
})

it('should hash sha256 as hex, base64, base64url and a buffer', () => {
  const plain = 'hello!@#123'
  expect(sha256(plain)).toMatchInlineSnapshot(
    `"4e6af34bdf31ddf67ffa21c7e0fa53a1a0ddf2b2a10918c2a5f5c773deb4407d"`,
  )
  expect(sha256(plain, 'base64')).toMatchInlineSnapshot(
    `"TmrzS98x3fZ/+iHH4PpToaDd8rKhCRjCpfXHc960QH0="`,
  )
  expect(sha256(plain, 'base64url')).toMatchInlineSnapshot(
    `"TmrzS98x3fZ_-iHH4PpToaDd8rKhCRjCpfXHc960QH0"`,
  )
  expect(sha256AsBuffer(plain)).toMatchInlineSnapshot(`
    {
      "data": [
        78,
        106,
        243,
        75,
        223,
        49,
        221,
        246,
        127,
        250,
        33,
        199,
        224,
        250,
        83,
        161,
        160,
        221,
        242,
        178,
        161,
        9,
        24,
        194,
        165,
        245,
        199,
        115,
        222,
        180,
        64,
        125,
      ],
      "type": "Buffer",
    }
  `)
})

it('should convert strings and buffers to and from base64', () => {
  const plain = 'hello!@#123'
  const buf = Buffer.from(plain, 'utf8')
  const hash = 'aGVsbG8hQCMxMjM='
  const enc = base64(plain)
  expect(base64(plain)).toBe(hash)
  expect(stringToBase64(plain)).toBe(hash)
  expect(base64(buf)).toBe(hash)
  expect(bufferToBase64(buf)).toBe(hash)
  expect(base64ToString(enc)).toBe(plain)
  expect(base64ToBuffer(enc)).toEqual(buf)
})

it('should accept plain Uint8Array (not Buffer)', () => {
  const plain = 'hello!@#123'
  const u8 = new TextEncoder().encode(plain)
  expect(Buffer.isBuffer(u8)).toBe(false)
  expect(base64(u8)).toBe('aGVsbG8hQCMxMjM=')
  expect(bufferToBase64(u8)).toBe('aGVsbG8hQCMxMjM=')
  // base64url omits padding, same as Buffer
  expect(base64Url(u8)).toBe('aGVsbG8hQCMxMjM')
  expect(bufferToBase64Url(u8)).toBe(Buffer.from(plain).toString('base64url'))
  expect(md5(u8)).toBe(md5(plain))
  expect(sha256(u8)).toBe(sha256(plain))
})
