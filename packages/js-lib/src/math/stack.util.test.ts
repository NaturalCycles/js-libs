import { expect, it } from 'vitest'
import { _range } from '../array/range.js'
import { NumberStack, Stack } from './stack.util.js'

it('should keep the last N numbers and compute their average, median and percentile', () => {
  const stack = new NumberStack(10)

  // Empty stack
  expect(stack.size).toBe(10)
  expect(stack.items).toEqual([])
  expect(stack.itemsOrdered).toEqual([])
  expect(stack.avgOrNull()).toBeNull()
  expect(stack.medianOrNull()).toBeNull()
  expect(stack.percentileOrNull(10)).toBeNull()

  // 6 items
  _range(1, 7).forEach(n => stack.push(n))
  expect(stack.size).toBe(10)
  expect(stack.items).toEqual([1, 2, 3, 4, 5, 6])
  expect(stack.itemsOrdered).toEqual([1, 2, 3, 4, 5, 6])
  expect(stack.avg()).toBe(3.5)
  expect(stack.median()).toBe(3.5)
  expect(stack.percentile(25)).toBe(2.25)

  // push 6 more items, it should overwrite itself
  _range(7, 13).forEach(n => stack.push(n))
  expect(stack.size).toBe(10)
  expect(stack.items).toEqual([11, 12, 3, 4, 5, 6, 7, 8, 9, 10])
  expect(stack.itemsOrdered).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  expect(stack.avg()).toBe(7.5)
  expect(stack.median()).toBe(7.5)
  expect(stack.percentile(25)).toBe(5.25)

  // fill with ones
  stack.fill(1)
  expect(stack.items).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
})

it('should fill every slot with zero', () => {
  const stack = new Stack(5).fill(0)
  expect(stack.items).toEqual([0, 0, 0, 0, 0])
})

it('percentile should not reorder the underlying buffer', () => {
  const stack = new NumberStack(3)
  ;[3, 1, 2, 5].forEach(n => stack.push(n))
  expect(stack.itemsOrdered).toEqual([1, 2, 5])

  expect(stack.percentile(50)).toBe(2)
  expect(stack.percentiles([0, 100])).toEqual({ 0: 1, 100: 5 })
  expect(stack.median()).toBe(2)

  // Order is preserved, and the next push overwrites the oldest item (1)
  expect(stack.itemsOrdered).toEqual([1, 2, 5])
  stack.push(7)
  expect(stack.itemsOrdered).toEqual([2, 5, 7])
})
