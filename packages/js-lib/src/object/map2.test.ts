import { expect, expectTypeOf, test } from 'vitest'
import { _deepEquals } from './deepEquals.js'
import { Map2 } from './map2.js'

/* eslint-disable @typescript-eslint/no-base-to-string */

test('map2', () => {
  const m = new Map([
    ['a', 1],
    ['b', 2],
  ])
  expect(JSON.stringify(m)).toBe('{}') // boring
  expect(m.toString()).toMatchInlineSnapshot(`"[object Map]"`)

  const m2 = new Map2([
    ['a', 1],
    ['b', 2],
  ])
  expectTypeOf(m2).toEqualTypeOf<Map2<string, number>>()
  expect(m2.toObject()).toEqual({ a: 1, b: 2 })
  expect(m2.toString()).toMatchInlineSnapshot(`"[object Map]"`)
  expect(m2 instanceof Map2).toBe(true)
  expect(m2 instanceof Map).toBe(true)

  expect(JSON.stringify(m2)).toMatchInlineSnapshot(`"{"a":1,"b":2}"`)

  const m3 = Map2.of({ a: 1, b: 2 })
  expectTypeOf(m3).toEqualTypeOf<Map2<string, number>>()

  expect(_deepEquals(m2, m3)).toBe(true)

  m3.setMany({
    c: 3,
  })
  expect(m3.toObject()).toEqual({ a: 1, b: 2, c: 3 })
})
