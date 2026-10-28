import { expect, it, vi } from 'vitest'
import { _range } from '../array/index.js'
import { _isBetween, _randomInt, _runLessOften } from '../index.js'
import { _clamp, _randomArrayItem, _round, _toFixed, _toPrecision } from './number.util.js'

it('should return an integer within the inclusive range', () => {
  const f = _randomInt
  expect(f(0, 0)).toBe(0)

  for (let i = 0; i < 20; i++) {
    const v = f(0, 5)
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThanOrEqual(5)
    expect(Math.round(v)).toStrictEqual(v)
  }
})

it('should return an item of the array', () => {
  const a = [1, 2, 3]
  _range(50).forEach(() => {
    const v = _randomArrayItem(a)
    expect(a).toContain(v)
  })
})

it.each([
  [2, 1, 3, true],
  [2, 2, 3, true],
  [2, 2, 1, false],
  [2, 2, 2, false],
  [2, Number.NEGATIVE_INFINITY, 3, true],
  ['2020-01-03', '2020-01-01', '2020-01-05', true],
])('should compute half-open _isBetween(%s, %s, %s) as %s', (n, min, max, result) => {
  expect(_isBetween(n, min, max, '[)')).toBe(result)
})

it.each([
  [2, 1, 3, true],
  [2, 2, 3, true],
  [2, 2, 1, false],
  [2, 2, 2, true],
  [2, Number.NEGATIVE_INFINITY, 3, true],
])('should compute inclusive _isBetween(%s, %s, %s) as %s', (n, min, max, result) => {
  expect(_isBetween(n, min, max, '[]')).toBe(result)
})

it.each([
  [1634, 1000, 2000],
  [1634, 500, 1500],
  [1634, 100, 1600],
  [1634, 10, 1630],
  [1634, 1, 1634],
  [1634.123, 1, 1634],
  [1634.5678, 0.1, 1634.6],
  [1634.5678, 0.5, 1634.5],
  [1634.5678, 0.3, 1634.6],
  [1634.5678, 0.01, 1634.57],
  [1634.5678, 0.02, 1634.56],
  [1634.5678, 0.03, 1634.57],
  [1634.5678, 0.05, 1634.55],
  [17, 5, 15],
  [18, 5, 20],
  [75, 60, 60],
  [90, 60, 120],
])('should compute _round(%s, %s) as %s', (n, precisionUnit, result) => {
  expect(_round(n, precisionUnit)).toBe(result)
})

it.each([
  [0.1604, 1, 0.2],
  [0.1604, 2, 0.16],
  [0.1604, 3, 0.16],
  [0.1604, 4, 0.1604],
  [0.1604, 10, 0.1604],
])('should compute _toFixed(%s, %s) as %s', (n, fractionDigits, result) => {
  expect(_toFixed(n, fractionDigits)).toBe(result)
})

it.each([
  [1634, 1, 2000],
  [1634, 2, 1600],
  [1634, 3, 1630],
  [1634, 4, 1634],
  [1634, 5, 1634],
  [1634.567, 5, 1634.6],
  [1634.567, 6, 1634.57],
  [1634.567, 7, 1634.567],
  [1634.567, 8, 1634.567],
])('should compute _toPrecision(%s, %s) as %s', (n, precision, result) => {
  expect(_toPrecision(n, precision)).toBe(result)
})

it.each([
  [3, 5, 10, 5],
  [4, 5, 10, 5],
  [5, 5, 10, 5],
  [6, 5, 10, 6],
  [8, 5, 10, 8],
  [9, 5, 10, 9],
  [10, 5, 10, 10],
  [11, 5, 10, 10],
  [999, 5, 10, 10],
  [-10, 5, 10, 5],
])('should compute _clamp(%s, %s, %s) as %s', (x, min, max, result) => {
  expect(_clamp(x, min, max)).toBe(result)
})

it('should run only when Math.random falls below the given percent', () => {
  vi.spyOn(Math, 'random').mockReturnValueOnce(0.05).mockReturnValueOnce(0.15)

  expect(_runLessOften(10)).toBe(true)
  expect(_runLessOften(10)).toBe(false)
})
