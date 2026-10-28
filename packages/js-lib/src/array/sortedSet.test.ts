import { expect, it } from 'vitest'
import { comparators } from './sort.js'
import { SortedSet } from './sortedSet.js'

it('should sort the initial values', () => {
  const set = new SortedSet(['c', 'a', 'b'])

  expect(Array.from(set)).toEqual(['a', 'b', 'c'])
  expect(set.first()).toBe('a')
})

it('should keep items sorted and skip duplicates on add', () => {
  const set = new SortedSet(['b'])

  set.add('d').add('a').add('c').add('b')

  expect(Array.from(set)).toEqual(['a', 'b', 'c', 'd'])
  expect(set.size).toBe(4)
})

it('should keep items sorted and skip duplicates on addMany', () => {
  const set = new SortedSet(['d'])

  set.addMany(['c', 'a', 'b', 'a'])

  expect(Array.from(set)).toEqual(['a', 'b', 'c', 'd'])
})

it('should sort with a custom comparator', () => {
  const set = new SortedSet<number>([1, 3, 2], { comparator: comparators.numericDesc })

  expect(Array.from(set)).toEqual([3, 2, 1])

  set.add(4).addMany([0, 2])
  expect(Array.from(set)).toEqual([4, 3, 2, 1, 0])
})

it('should report as a Set and serialize to a sorted array', () => {
  const set = new SortedSet(['b', 'a', 'c'])

  expect(set.constructor.name).toBe('SortedSet')
  expect(Object.prototype.toString.call(set)).toBe('[object Set]')
  expect(set.toJSON()).toEqual(['a', 'b', 'c'])
})
