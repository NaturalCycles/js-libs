import { expect, test } from 'vitest'
import { comparators } from '../array/sort.js'
import { KeySortedMap } from './keySortedMap.js'

test('constructs with sorted keys and keeps last value for duplicates', () => {
  const map = new KeySortedMap([
    ['beta', 1],
    ['alpha', 2],
    ['beta', 3],
  ])

  expect(map.size).toBe(2)
  expect(map.get('alpha')).toBe(2)
  expect(map.get('beta')).toBe(3)
  expect(map.keysArray()).toEqual(['alpha', 'beta'])
  expect(Array.from(map.entries())).toEqual([
    ['alpha', 2],
    ['beta', 3],
  ])
  expect(Object.prototype.toString.call(map)).toBe('[object KeySortedMap]')
})

test('set inserts keys in sorted order and exposes sorted views', () => {
  const map = new KeySortedMap<number, string>()
  map.set(5, 'five')
  map.set(1, 'one')
  map.set(3, 'three')
  map.set(2, 'two')
  map.set(4, 'four')

  expect(map.size).toBe(5)
  expect(map.firstKey()).toBe(1)
  expect(map.lastKey()).toBe(5)
  expect(map.keysArray()).toEqual([1, 2, 3, 4, 5])
  expect(map.valuesArray()).toEqual(['one', 'two', 'three', 'four', 'five'])
  expect(map.entriesArray()).toEqual([
    [1, 'one'],
    [2, 'two'],
    [3, 'three'],
    [4, 'four'],
    [5, 'five'],
  ])
})

test('numeric keys stay numerically sorted when enabled', () => {
  const map = new KeySortedMap<number, string>(
    [
      [15, 'fifteen'],
      [1, 'one'],
      [5, 'five'],
      [10, 'ten'],
    ],
    { comparator: comparators.numericAsc },
  )

  expect(Array.from(map.keys())).toEqual([1, 5, 10, 15])
  expect(Array.from(map.entries())).toEqual([
    [1, 'one'],
    [5, 'five'],
    [10, 'ten'],
    [15, 'fifteen'],
  ])
})

test('of() builds a map from object entries', () => {
  const map = KeySortedMap.of({ beta: 2, alpha: 1 })

  expect(map instanceof KeySortedMap).toBe(true)
  expect(Array.from(map.keys())).toEqual(['alpha', 'beta'])
  expect(map.get('alpha')).toBe(1)
  expect(map.get('beta')).toBe(2)
})

test('setMany adds multiple entries and resorts once', () => {
  const map = new KeySortedMap<string, number>()

  map.set('delta', 4)
  map.setMany({ bravo: 2, alpha: 1, charlie: 3 })

  expect(Array.from(map.keys())).toEqual(['alpha', 'bravo', 'charlie', 'delta'])
  expect(Array.from(map.values())).toEqual([1, 2, 3, 4])
})

test('toObject and toJSON expose plain records', () => {
  const map = new KeySortedMap<string, number>([
    ['b', 2],
    ['a', 1],
  ])

  const obj = map.toObject()

  expect(obj).toEqual({ a: 1, b: 2 })
  expect(JSON.parse(JSON.stringify(map))).toEqual(obj)
  expect(map.toJSON()).toEqual(obj)
})

test('updates existing keys without duplicating or reordering', () => {
  const map = new KeySortedMap<number, string>()
  map.set(2, 'two')
  map.set(1, 'one')

  const result = map.set(2, 'two updated')

  expect(result).toBe(map)
  expect(map.size).toBe(2)
  expect(map.get(2)).toBe('two updated')
  expect(map.keysArray()).toEqual([1, 2])
})

test('delete handles present and missing keys while keeping order', () => {
  const map = new KeySortedMap<number, string>([
    [10, 'ten'],
    [5, 'five'],
    [1, 'one'],
  ])

  expect(map.delete(99)).toBe(false)
  expect(map.delete(5)).toBe(true)
  expect(map.has(5)).toBe(false)
  expect(map.keysArray()).toEqual([1, 10])
  expect(map.firstEntry()).toEqual([1, 'one'])
  expect(map.lastEntry()).toEqual([10, 'ten'])

  map.delete(1)
  map.delete(10)

  expect(map.size).toBe(0)
  expect(map.firstKey()).toBeUndefined()
  expect(map.lastEntry()).toBeUndefined()
})

test('clear removes all entries and iteration helpers reflect emptiness', () => {
  const map = new KeySortedMap<number, string>([
    [3, 'three'],
    [1, 'one'],
    [2, 'two'],
  ])

  map.clear()

  expect(map.size).toBe(0)
  expect(map.keysArray()).toEqual([])
  expect(Array.from(map.keys())).toEqual([])
  expect(Array.from(map.values())).toEqual([])
  expect(Array.from(map)).toEqual([])
  expect(map.firstKey()).toBeUndefined()
  expect(map.lastKey()).toBeUndefined()
  expect(map.firstEntry()).toBeUndefined()
  expect(map.lastEntry()).toBeUndefined()
})

test('iterators and forEach use sorted order and pass the map and thisArg', () => {
  const map = new KeySortedMap<number, string>([
    [3, 'three'],
    [1, 'one'],
    [2, 'two'],
  ])

  const context = { keys: [] as number[], values: [] as string[] }

  map.forEach(function (this: typeof context, value, key, receivedMap) {
    this.keys.push(key)
    this.values.push(value)
    expect(receivedMap).toBe(map)
  }, context)

  expect(context.keys).toEqual([1, 2, 3])
  expect(context.values).toEqual(['one', 'two', 'three'])
  expect(Array.from(map.keys())).toEqual([1, 2, 3])
  expect(Array.from(map.values())).toEqual(['one', 'two', 'three'])
  expect(Array.from(map.entries())).toEqual([
    [1, 'one'],
    [2, 'two'],
    [3, 'three'],
  ])
  expect(Array.from(map)).toEqual([
    [1, 'one'],
    [2, 'two'],
    [3, 'three'],
  ])
})
