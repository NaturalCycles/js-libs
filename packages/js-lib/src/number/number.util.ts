import type { Inclusiveness, SortDirection } from '../types.js'

export function _randomInt(minIncl: number, maxIncl: number): number {
  return Math.floor(Math.random() * (maxIncl - minIncl + 1) + minIncl)
}

/**
 * Returns random item from an array.
 * Should be used on non-empty arrays! (otherwise will return undefined,
 * which is not reflected in the output type)
 */
export function _randomArrayItem<T>(array: T[]): T {
  return array[_randomInt(0, array.length - 1)]!
}

/**
 * Convenience function to "throttle" some code - run it less often.
 *
 * @example
 *
 * if (_runLessOften(10)) {
 *   // this code will run only 10% of the time
 * }
 */
export function _runLessOften(percent: number): boolean {
  return Math.random() * 100 < percent
}

// todo: _.random to support floats

/**
 *  _isBetween(-10, 1, 5) // false
 * _isBetween(1, 1, 5) // true
 * _isBetween(3, 1, 5) // true
 * _isBetween(5, 1, 5) // false
 * _isBetween(7, 1, 5) // false
 *
 * Also works with strings:
 * _isBetween('2020-01-03', '2020-01-01', '2020-01-05') // true
 */
export function _isBetween<T extends number | string>(
  x: T,
  min: T,
  max: T,
  incl: Inclusiveness,
): boolean {
  if (x < min || x > max) return false
  if (x === max && incl === '[)') return false
  return true
}

export function _clamp(x: number, minIncl: number, maxIncl: number): number {
  // eslint-disable-next-line unicorn/prefer-math-min-max
  return x <= minIncl ? minIncl : x >= maxIncl ? maxIncl : x
}

/**
 * This function exists, because in JS you cannot just .sort() numbers,
 * as .sort() function first maps everything to String.
 *
 * @example
 *
 * _sortNumbers([1, 3, 2])
 * // [1, 2, 3]
 */
export function _sortNumbers(
  numbers: number[],
  mutate = false,
  dir: SortDirection = 'asc',
): number[] {
  const mod = dir === 'desc' ? -1 : 1
  return (mutate ? numbers : [...numbers]).sort((a, b) => (a - b) * mod)
}

/**
 * Same as .toFixed(), but conveniently casts the output to Number.
 *
 * @example
 *
 * _toFixed(1.2345, 2)
 * // 1.23
 *
 * _toFixed(1.10, 2)
 * // 1.1
 */
export function _toFixed(n: number, fractionDigits: number): number {
  return Number(n.toFixed(fractionDigits))
}

/**
 * Same as .toPrecision(), but conveniently casts the output to Number.
 *
 * @example
 *
 * _toPrecision(1634.56, 1)
 * // 2000
 *
 * _toPrecision(1634.56, 2)
 * // 1600
 */
export function _toPrecision(n: number, precision: number): number {
  return Number(n.toPrecision(precision))
}

/**
 * @example
 *
 * _round(1634, 1000) // 2000
 * _round(1634, 500) // 1500
 * _round(1634, 100) // 1600
 * _round(1634, 10) // 1630
 * _round(1634, 1) // 1634
 * _round(1634.5678, 0.1) // 1634.6
 * _round(1634.5678, 0.01) // 1634.57
 */
export function _round(n: number, precisionUnit: number): number {
  if (precisionUnit >= 1) {
    return Math.round(n / precisionUnit) * precisionUnit
  }

  const v = Math.floor(n) + Math.round((n % 1) / precisionUnit) * precisionUnit
  return Number(v.toFixed(String(precisionUnit).length - 2)) // '0.
}
