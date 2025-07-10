import { expect, test } from 'vitest'
import { _mapToObject } from '../array/array.util.js'
import { _range } from '../array/range.js'
import { _averageOrNull, _percentiles } from './index.js'
import { _average, _averageWeighted, _median, _percentile } from './math.util.js'

const numbers = [
  32.31,
  36.6,
  39.1,
  40.8,
  66.7,
  97.88,
  103.5,
  30.005, // requires "epsilon trick"
  100.005,
  0,
  1,
  -1,
  10 / 3,
]

test.each([
  [[1], 1],
  [[1, 2], 1.5],
  [[1, 2, 3], 2],
  [[2, 3, 10], 5],
])('_average(%s) === %s', (numbers, result) => {
  expect(_average(numbers)).toBe(result)
})

test('_averageOrNull', () => {
  expect(() => _average([])).toThrowErrorMatchingInlineSnapshot(
    `[AssertionError: _average is called on empty array]`,
  )
  expect(_averageOrNull(undefined)).toBeNull()
  expect(_averageOrNull(null)).toBeNull()
  expect(_averageOrNull([1])).toBe(1)
})

test('_averageWeighted', () => {
  expect(_averageWeighted([1, 2], [3, 1])).toMatchInlineSnapshot('1.25')

  const weights = numbers.map((_, i) => 1 + 0.1 * i)
  expect(_averageWeighted(numbers, weights)).toBe(39.25869391025641)
})

test.each([
  [[1], 50, 1],
  [[1, 2], 50, 1.5],
  [[1, 3], 50, 2],
  [[1, 2, 3], 50, 2],
  [[1, 2, 3], 75, 2.5],
  [[1, 2, 3, 4], 50, 2.5],
  [[1, 2, 3, 4, 5], 50, 3],
  [[1, 2, 3, 4, 5], 75, 4],
  [[1, 2, 3, 4, 5], 100, 5],
  [[1, 2, 3, 5, 5], 50, 3],
  [[1, 2, 4, 5], 50, 3],
  [[0, 1, 2, 3, 4, 5], 0, 0],
  [[0, 1, 2, 3, 4, 5], 20, 1],
  [[0, 1, 2, 3, 4, 5], 40, 2],
  [[0, 1, 2, 3, 4, 5], 60, 3],
  [[0, 1, 2, 3, 4, 5], 80, 4],
  [[0, 1, 2, 3, 4, 5], 100, 5],
])('_percentile(%s, %s) === %s', (numbers, pc, result) => {
  expect(_percentile(numbers, pc)).toBe(result)
})

test('_percentile', () => {
  const numbers = [1200, 1400]

  const pcs = _mapToObject(_range(0, 101, 10), pc => [pc, _percentile(numbers, pc)])

  // console.log(pcs)
  expect(pcs).toMatchInlineSnapshot(`
    {
      "0": 1200,
      "10": 1220,
      "100": 1400,
      "20": 1240,
      "30": 1260,
      "40": 1280,
      "50": 1300,
      "60": 1320,
      "70": 1340,
      "80": 1360,
      "90": 1380,
    }
  `)
})

test('_percentiles', () => {
  const numbers = [1200, 1400]

  const pcs = _percentiles(numbers, [50, 90, 99])
  expect(pcs).toMatchInlineSnapshot(`
    {
      "50": 1300,
      "90": 1380,
      "99": 1398,
    }
  `)
})

test('_median', () => {
  expect(_median([1, 2, 3])).toBe(2)
})
