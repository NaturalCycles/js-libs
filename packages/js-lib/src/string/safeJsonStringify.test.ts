import { expect, it } from 'vitest'
import { _safeJsonStringify } from './safeJsonStringify.js'

it('_safeJsonStringify', () => {
  const obj = {
    a: 'a',
  }

  expect(_safeJsonStringify(obj)).toBe(`{"a":"a"}`)
  expect(JSON.parse(_safeJsonStringify(obj))).toEqual(obj)

  const circular: any = {
    obj,
  }
  circular.meta = circular

  expect(_safeJsonStringify(circular)).toMatchInlineSnapshot(
    `"{"obj":{"a":"a"},"meta":"[Circular ~]"}"`,
  )

  const c2 = JSON.parse(_safeJsonStringify(circular))
  expect(c2.obj).toEqual(circular.obj)
  // expect(c2.meta.obj).toEqual(circular.obj)
  // expect(c2.meta.obj.meta.obj).toEqual(circular.obj)

  // expect(_deepEquals(circular2, circular)).toBe(true)
  // expect(circular2).toMatchObject(circular)
})
