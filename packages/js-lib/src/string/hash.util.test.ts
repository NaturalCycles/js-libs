import { expect, it } from 'vitest'
import { hashCode, hashCode16, hashCode36, hashCode64 } from './hash.util.js'

it('should hash a string to stable numeric, hex, base36 and base64 values', () => {
  const obj = {
    a: 'a',
    b: 'b',
    n: 12,
    c: {
      d: 'd',
    },
  }

  let s = JSON.stringify(obj)
  // expect(hashCode(s)).toMatchInlineSnapshot(`-480055922`)
  expect(hashCode(s)).toMatchInlineSnapshot('1667427726')
  expect(hashCode16(s)).toMatchInlineSnapshot(`"6362ed8e"`)
  // expect(hashCodeBase32(s)).toMatchInlineSnapshot(`"1hm5rce"`)
  expect(hashCode36(s)).toMatchInlineSnapshot(`"rkqrgu"`)
  expect(hashCode64(s)).toMatchInlineSnapshot(`"AiXt1O"`)

  obj.a = 'aa'
  s = JSON.stringify(obj)
  // expect(hashCode(s)).toMatchInlineSnapshot(`-1118941361`)
  expect(hashCode(s)).toMatchInlineSnapshot('1028542287')
  expect(hashCode16(s)).toMatchInlineSnapshot(`"3d4e4f4f"`)
  // expect(hashCodeBase32(s)).toMatchInlineSnapshot(`"uksjqf"`)
  expect(hashCode36(s)).toMatchInlineSnapshot(`"h0d8b3"`)
  expect(hashCode64(s)).toMatchInlineSnapshot(`"8Sj8P"`)

  // expect(numberToBase64(62)).toMatchInlineSnapshot(`"+"`)
  // expect(numberToBase64(63)).toMatchInlineSnapshot(`"/"`)
  // expect(numberToBase64(64)).toMatchInlineSnapshot(`"AA"`)
  // expect(numberToBase64(65)).toMatchInlineSnapshot(`"AB"`)
  //
  // expect(numberToBase64url(62)).toMatchInlineSnapshot(`"-"`)
  // expect(numberToBase64url(63)).toMatchInlineSnapshot(`"_"`)
  // expect(numberToBase64url(64)).toMatchInlineSnapshot(`"AA"`)
  // expect(numberToBase64url(65)).toMatchInlineSnapshot(`"AB"`)
})
