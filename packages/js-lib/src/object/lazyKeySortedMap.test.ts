import { expect, it } from 'vitest'
import { comparators } from '../array/sort.js'
import { LazyKeySortedMap } from './lazyKeySortedMap.js'

it('should update existing keys passed to setMany without duplicating them in the key order', () => {
  const map = new LazyKeySortedMap<string, number>([
    ['bravo', 2],
    ['delta', 4],
  ])

  map.setMany({ delta: 40, charlie: 3, bravo: 20, alpha: 1 })

  expect(map.size).toBe(4)
  expect(map.keys().toArray()).toEqual(['alpha', 'bravo', 'charlie', 'delta'])
  expect(map.values().toArray()).toEqual([1, 20, 3, 40])
})

it('should return the last entry with lastEntry', () => {
  const map = new LazyKeySortedMap([
    ['bravo', 2],
    ['alpha', 1],
  ])

  expect(map.lastEntry()).toEqual(['bravo', 2])
  expect(Object.prototype.toString.call(map)).toBe('[object LazyKeySortedMap]')
})

it('should return falsy keys and values from the first and last accessors', () => {
  const map = new LazyKeySortedMap<number, string>(
    [
      [0, ''],
      [-1, ''],
    ],
    { comparator: comparators.numericAsc },
  )

  expect(map.lastKey()).toBe(0)
  expect(map.firstValue()).toBe('')
  expect(map.lastValue()).toBe('')
})
