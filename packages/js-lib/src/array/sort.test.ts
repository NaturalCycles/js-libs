import { expect, test } from 'vitest'
import { _deepFreeze } from '../object/index.js'
import { _sortBy, comparators } from './sort.js'

test('_sortBy', () => {
  const a = [{ age: 20 }, { age: 10 }]
  _deepFreeze(a)
  expect(_sortBy(a, r => r.age)).toEqual([{ age: 10 }, { age: 20 }])
  expect(_sortBy(a, o => o.age)).toEqual([{ age: 10 }, { age: 20 }])
  expect(_sortBy(a, o => o.age, { dir: 'desc' })).toEqual([{ age: 20 }, { age: 10 }])
})

test('_sortBy with mutation', () => {
  const a = [{ age: 20 }, { age: 10 }]
  const r = _sortBy(a, r => r.age, { mutate: true })
  expect(r).toEqual([{ age: 10 }, { age: 20 }])
  expect(r).toBe(a)
})

test.each([
  [[], []],
  [[3], [3]],
  [
    [3, 1],
    [1, 3],
  ],
  [
    [1, 2, 3, 4],
    [1, 2, 3, 4],
  ],
  [
    [1, 2, 4, 3],
    [1, 2, 3, 4],
  ],
  [
    [4, 3, 2, 3],
    [2, 3, 3, 4],
  ],
  [
    [4, 3, 3, 3],
    [3, 3, 3, 4],
  ],
  [
    [4, 1, 3, 1],
    [1, 1, 3, 4],
  ],
])('sort numbers with comparators.numericAsc', (numbers, result) => {
  expect(numbers.sort(comparators.numericAsc)).toEqual(result)
  expect(numbers.sort(comparators.numericDesc)).toEqual(result.toReversed())
})

test('comparators.locale', () => {
  const a = ['a', 'r', 'Z']
  expect(a.sort(comparators.localeAsc)).toEqual(['a', 'r', 'Z'])
  expect(a.sort(comparators.localeDesc)).toEqual(['Z', 'r', 'a'])
})
