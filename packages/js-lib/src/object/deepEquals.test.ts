import { expect, it } from 'vitest'
import { deepEqualsMocks } from '../test/deepEqualsMocks.js'
import { _deepEquals, _deepJsonEquals, _jsonEquals } from './deepEquals.js'

it('should return true for equal objects and false for an extra key', () => {
  expect(
    _deepEquals(
      {
        a: 1,
        b: 2,
      },
      {
        a: 1,
        b: 2,
      },
    ),
  ).toBe(true)

  expect(
    _deepEquals(
      {
        a: 1,
        b: 2,
      },
      {
        a: 1,
        b: 2,
        c: 3,
      },
    ),
  ).toBe(false)
})

it.each(deepEqualsMocks)(
  'should compare %o and %o as jsonEq=%s deepJsonEq=%s deepEq=%s',
  (v1, v2, jsonEq, deepJsonEq, deepEq) => {
    if (jsonEq !== 'error') {
      expect(_jsonEquals(v1, v2)).toBe(jsonEq)
    }
    expect(_deepJsonEquals(v1, v2)).toBe(deepJsonEq)
    expect(_deepEquals(v1, v2)).toBe(deepEq)
  },
)
