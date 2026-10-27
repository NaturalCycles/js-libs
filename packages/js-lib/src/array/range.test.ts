import { expect, it } from 'vitest'
import { _arrayFilled, _range } from './range.js'

it('should create a range from start to exclusive end with an optional step', () => {
  expect(_range(3)).toEqual([0, 1, 2])
  expect(_range(3, 6)).toEqual([3, 4, 5])
  expect(_range(6, 3)).toEqual([])
  expect(_range(1, 10, 2)).toEqual([1, 3, 5, 7, 9])
  expect(_range(1, 11, 2)).toEqual([1, 3, 5, 7, 9])
  expect(_range(1, 12, 2)).toEqual([1, 3, 5, 7, 9, 11])
})

it('should create an array of the given length filled with the value', () => {
  expect(_arrayFilled(0, null)).toEqual([])
  expect(_arrayFilled(1, null)).toEqual([null])
  expect(_arrayFilled(2, null)).toEqual([null, null])
  expect(_arrayFilled(3, 1)).toEqual([1, 1, 1])
  expect(_arrayFilled(4, 's')).toEqual(['s', 's', 's', 's'])
})
