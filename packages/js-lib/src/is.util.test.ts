import { mockAllKindsOfThings } from '@naturalcycles/dev-lib/testing'
import { expect, expectTypeOf, it } from 'vitest'
import { _sum } from './array/array.util.js'
import {
  _isEmpty,
  _isEmptyObject,
  _isNotEmpty,
  _isNotEmptyObject,
  _isNull,
  _isObject,
  _isPlainObject,
  _isPrimitive,
  _isTruthy,
} from './is.util.js'
import { _undefinedIfEmpty } from './object/object.util.js'
import { expectResults } from './test/test.util.js'
import { SKIP } from './types.js'

it.each([[undefined], [null], [1], [true], ['hello']] as any[])(
  'should treat "%s" as a primitive',
  v => {
    expect(_isPrimitive(v)).toBe(true)
  },
)

it.each([[[]], [{}], [() => {}]] as any[])('should not treat "%s" as a primitive', v => {
  expect(_isPrimitive(v)).toBe(false)
})

it.each([
  [undefined, true],
  [null, true],
  ['', true],
  [{}, true],
  [[], true],
  [new Map(), true],
  [new Set(), true],
  [0, false],
  [1, false],
  ['a', false],
  [{ a: 'a' }, false],
  [['a'], false],
  [[undefined], false],
  [[{}], false],
  [new Map([['a', 'b']]), false],
  [new Set(['']), false],
  [false, false],
  [true, false],
])('should classify %o as empty: %s', (v, empty) => {
  expect(_isEmpty(v)).toBe(empty)
  expect(_isNotEmpty(v)).toBe(!empty)
  expect(_undefinedIfEmpty(v)).toBe(empty ? undefined : v)
})

it('should accept objects, regexes and class instances, but not arrays, functions or primitives', () => {
  const a: any[] = [
    1,
    0,
    -1,
    undefined,
    null,
    'wer',
    'a',
    '',
    {},
    { a: 'b' },
    [],
    /some/,
    () => {},
    SKIP,
  ]
  const r = a.filter(i => _isObject(i))
  expect(r).toEqual([{}, { a: 'b' }, /some/])

  class Obj {}

  expect(_isObject(new Obj())).toBe(true)
})

it('should accept only object literals and null-prototype objects as plain objects', () => {
  expect(_isPlainObject({})).toBe(true)
  expect(_isPlainObject({ a: 1 })).toBe(true)
  expect(_isPlainObject(Object.create(null))).toBe(true)

  class Obj {}

  const a: any[] = [
    [],
    null,
    undefined,
    's',
    1,
    new Error('e'),
    new Date(),
    new Obj(),
    /re/,
    () => {},
  ]
  for (const v of a) {
    expect(_isPlainObject(v)).toBe(false)
  }
})

it('should detect an object without own keys as empty', () => {
  const a: any[] = [{}, { a: 'b' }]

  const empty = a.filter(i => _isEmptyObject(i))
  expect(empty).toEqual([{}])
  expect(_isNotEmptyObject({})).toBe(false)
})

it('should return true only for null', () => {
  expectResults(v => _isNull(v), mockAllKindsOfThings()).toMatchSnapshot()
})

it('should filter out nullish values and narrow the array type', () => {
  const a = [1, 2, undefined, null, 3].filter(_isTruthy)
  // This tests that type of a is number[] (no "undefined/null")
  expect(_sum(a)).toBe(6)

  expectTypeOf(a).toEqualTypeOf<number[]>()

  // Test that build-in `.filter(Boolean)` behaves the same since TypeScript 5.5
  // UPD: no, unfortunately it still doesn't work
  // const b = [1, 2, undefined, null, 3].filter(Boolean)
  // expectTypeOf(b).toEqualTypeOf<number[]>()
})
