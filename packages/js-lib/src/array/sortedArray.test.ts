import { expect, it } from 'vitest'
import { SortedArray, SortedNumberArray, SortedStringArray } from './sortedArray.js'

it('should be recognized by Array.isArray', () => {
  expect(Array.isArray(new SortedArray())).toBe(true)
})

it('should stringify and serialize to JSON like a native array', () => {
  const a = new SortedArray([1, 2, 3])
  const native = [1, 2, 3]
  expect(a.toString()).toMatchInlineSnapshot(`"1,2,3"`)
  expect(a.toString()).toBe(native.toString())
  expect(JSON.stringify(a)).toBe(JSON.stringify(native))
})

it('should sort the initial values', () => {
  const arr = new SortedArray(['c', 'a', 'b'])

  expect(arr).toEqual(['a', 'b', 'c'])
  expect(arr.first()).toBe('a')
  expect(arr.last()).toBe('c')
})

it('should keep items sorted after push', () => {
  const arr = new SortedArray(['b'])

  arr.push('d', 'a', 'c')

  expect(arr).toEqual(['a', 'b', 'c', 'd'])
})

it('should keep items sorted after unshift and splice', () => {
  const arr = new SortedArray(['d'])

  arr.unshift('c')
  expect(arr).toEqual(['c', 'd'])

  arr.unshift('b', 'a')
  expect(arr).toEqual(['a', 'b', 'c', 'd'])

  const removed = arr.splice(0, 0, 'aa')
  expect(removed).toEqual([])
  expect(arr).toEqual(['a', 'aa', 'b', 'c', 'd'])

  const removedValue = arr.splice(2, 1)
  expect(removedValue).toEqual(['b'])
  expect(arr).toEqual(['a', 'aa', 'c', 'd'])
})

it('should sort with a custom comparator', () => {
  const arr = new SortedArray<number>([1, 3, 2], { comparator: (a, b) => b - a })

  expect(arr).toEqual([3, 2, 1])

  arr.push(4)
  expect(arr).toEqual([4, 3, 2, 1])
})

it('should sort numbers numerically in SortedNumberArray', () => {
  const arr = new SortedNumberArray([10, 2, 1])

  expect(arr).toEqual([1, 2, 10])

  arr.push(3)
  expect(arr).toEqual([1, 2, 3, 10])
})

it('should keep the subclass constructor names and report as an Array', () => {
  expect(new SortedArray().constructor.name).toBe('SortedArray')
  expect(new SortedStringArray().constructor.name).toBe('SortedStringArray')
  expect(new SortedNumberArray().constructor.name).toBe('SortedNumberArray')
  expect(Object.prototype.toString.call(new SortedArray())).toBe('[object Array]')
})
