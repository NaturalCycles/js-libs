import { expect, it } from 'vitest'
import { deepEqualsMocks } from '../test/deepEqualsMocks.js'
import { _deepEquals, _deepJsonEquals, _jsonEquals } from './deepEquals.js'

it('should treat objects with keys in a different order as equal', () => {
  expect(
    _deepEquals(
      {
        a: 1,
        b: 2,
      },
      {
        b: 2,
        a: 1,
      },
    ),
  ).toBe(true)
})

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

it('should ignore a key with an undefined value', () => {
  const a = {
    a: 'a',
    b: 'b',
  }
  const b = {
    ...a,
    c: undefined,
  }

  expect(_deepEquals(a, b)).toBe(true)
  expect(_deepJsonEquals(a, b)).toBe(true)
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

class A {
  constructor(public v: string) {}
  toJSON(): string {
    return this.v
  }
}

it('should not throw when comparing a toJSON class instance with a string', () => {
  const r = _deepEquals(new A('a'), 'a' as any)
  console.log(r)
})
