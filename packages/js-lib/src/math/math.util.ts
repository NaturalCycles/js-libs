import { comparators } from '../array/sort.js'
import { _assert } from '../error/assert.js'

/**
 * @returns Average of the array of numbers
 *
 * @example
 *
 * _average([1, 2, 3, 4])
 * // 2.5
 */
export function _average(values: number[]): number {
  _assert(values.length, '_average is called on empty array')
  let total = 0
  for (const n of values) total += n
  return total / values.length
}

/**
 * Same as _average, but safely returns null if input array is empty or nullish.
 */
export function _averageOrNull(values: number[] | undefined | null): number | null {
  return values?.length ? _average(values) : null
}

/**
 * @returns Population standard deviation of the array of numbers
 *
 * @example
 *
 * _stdDev([2, 4, 4, 4, 5, 5, 7, 9])
 * // 2
 */
export function _stdDev(values: number[]): number {
  _assert(values.length, '_stdDev is called on empty array')
  const avg = _average(values)
  let sumSquaredDiff = 0
  for (const n of values) {
    const diff = n - avg
    sumSquaredDiff += diff * diff
  }
  return Math.sqrt(sumSquaredDiff / values.length)
}

/**
 * Same as _stdDev, but safely returns null if input array is empty or nullish.
 */
export function _stdDevOrNull(values: number[] | undefined | null): number | null {
  return values?.length ? _stdDev(values) : null
}

/**
 * valuesArray and weightsArray length is expected to be the same.
 */
export function _averageWeighted(values: number[], weights: number[]): number {
  let numerator = 0
  let denominator = 0
  for (let i = 0; i < values.length; i++) {
    numerator += values[i]! * weights[i]!
    denominator += weights[i]!
  }
  return numerator / denominator
}

/**
 * @example
 *
 * _percentile([1, 2, 3, 4], 50)
 * // 2.5
 *
 * _percentile([1, 2, 3], 50)
 * // 2
 *
 * _percentile([1, 2, 3], 100)
 * // 3
 */
export function _percentile(values: number[], pc: number): number {
  const sorted = values.sort(comparators.numericAsc)

  // Floating pos in the range of [0; length - 1]
  const pos = ((values.length - 1) * pc) / 100
  const dec = pos % 1
  const floorPos = Math.floor(pos)
  const ceilPos = Math.ceil(pos)

  return _averageWeighted([sorted[floorPos]!, sorted[ceilPos]!], [1 - dec, dec])
}

/**
 * A tiny bit more efficient function than calling _percentile individually.
 */
export function _percentiles(values: number[], pcs: number[]): Record<number, number> {
  const r = {} as Record<number, number>

  const sorted = values.sort(comparators.numericAsc)

  for (const pc of pcs) {
    // Floating pos in the range of [0; length - 1]
    const pos = ((values.length - 1) * pc) / 100
    const dec = pos % 1
    const floorPos = Math.floor(pos)
    const ceilPos = Math.ceil(pos)

    r[pc] = _averageWeighted([sorted[floorPos]!, sorted[ceilPos]!], [1 - dec, dec])
  }

  return r
}

/**
 * @example
 *
 * _median([1, 2, 3])
 * // 2
 *
 * _median([1, 2, 3, 4])
 * // 2.5
 */
export function _median(values: number[]): number {
  return _percentile(values, 50)
}
