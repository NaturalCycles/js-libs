import { expect, it } from 'vitest'
import { deepEqualsMocks } from '../test/deepEqualsMocks.js'
import { _deepEquals, _deepJsonEquals, _jsonEquals } from './deepEquals.js'

it('_deepEquals Issue!', () => {
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

it('_deepEquals', () => {
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

it('_deepJsonEquals', () => {
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
  '_deepEquals2 %s %s jsonEq=%s deepJsonEq=%s deepEq=%s',
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

it('debug', () => {
  const r = _deepEquals(new A('a'), 'a' as any)
  console.log(r)
})
