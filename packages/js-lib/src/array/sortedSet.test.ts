import { expect, test } from 'vitest'
import { comparators } from './sort.js'
import { SortedSet } from './sortedSet.js'

test('constructor sorts initial values', () => {
  const set = new SortedSet(['c', 'a', 'b'])

  expect(Array.from(set)).toEqual(['a', 'b', 'c'])
  expect(set.first()).toBe('a')
})

test('add keeps items sorted and skips duplicates', () => {
  const set = new SortedSet(['b'])

  set.add('d').add('a').add('c').add('b')

  expect(Array.from(set)).toEqual(['a', 'b', 'c', 'd'])
  expect(set.size).toBe(4)
})

test('addMany keeps items sorted', () => {
  const set = new SortedSet(['d'])

  set.addMany(['c', 'a', 'b', 'a'])

  expect(Array.from(set)).toEqual(['a', 'b', 'c', 'd'])
})

test('respects custom comparator', () => {
  const set = new SortedSet<number>([1, 3, 2], { comparator: comparators.numericDesc })

  expect(Array.from(set)).toEqual([3, 2, 1])

  set.add(4).addMany([0, 2])
  expect(Array.from(set)).toEqual([4, 3, 2, 1, 0])
})

test('serializes and identifies correctly', () => {
  const set = new SortedSet(['b', 'a', 'c'])

  expect(set.constructor.name).toBe('SortedSet')
  expect(Object.prototype.toString.call(set)).toBe('[object Set]')
  expect(set.toJSON()).toEqual(['a', 'b', 'c'])
})
