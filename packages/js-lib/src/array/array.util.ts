import { _assert } from '../error/assert.js'
import type {
  AbortablePredicate,
  FalsyValue,
  Mapper,
  MutateOptions,
  Predicate,
  StringMap,
} from '../types.js'
import { END } from '../types.js'

/**
 * Creates an array of elements split into groups the length of size. If collection can’t be split evenly, the
 * final chunk will be the remaining elements.
 *
 * @param array The array to process.
 * @param size The length of each chunk.
 * @returns Returns the new array containing chunks.
 *
 * https://lodash.com/docs#chunk
 *
 * Based on: https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_chunk
 */
export function _chunk<T>(array: readonly T[], size = 1): T[][] {
  const a: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    a.push(array.slice(i, i + size))
  }
  return a
}

/**
 * Removes duplicates from given array.
 */
export function _uniq<T>(a: readonly T[]): T[] {
  return [...new Set(a)]
}

/**
 * Pushes an item to an array if it's not already there.
 * Mutates the array (same as normal `push`) and also returns it for chaining convenience.
 *
 * _pushUniq([1, 2, 3], 2) // => [1, 2, 3]
 *
 * Shortcut for:
 * if (!a.includes(item)) a.push(item)
 * // or
 * a = [...new Set(a).add(item)]
 * // or
 * a = _uniq([...a, item])
 */
export function _pushUniq<T>(a: T[], ...items: T[]): T[] {
  for (const item of items) {
    if (!a.includes(item)) a.push(item)
  }
  return a
}

/**
 * Like _pushUniq but uses a mapper to determine uniqueness (like _uniqBy).
 * Mutates the array (same as normal `push`).
 */
export function _pushUniqBy<T>(a: T[], mapper: Mapper<T, any>, ...items: T[]): T[] {
  const mappedSet = new Set(a.map(mapper))
  for (const item of items) {
    const mapped = mapper(item)
    if (!mappedSet.has(mapped)) {
      a.push(item)
      mappedSet.add(mapped)
    }
  }
  return a
}

/**
 * This method is like `_.uniq` except that it accepts `iteratee` which is
 * invoked for each element in `array` to generate the criterion by which
 * uniqueness is computed. The iteratee is invoked with one argument: (value).
 *
 * @returns Returns the new duplicate free array.
 * @example
 *
 * _.uniqBy([2.1, 1.2, 2.3], Math.floor);
 * // => [2.1, 1.2]
 *
 * // using the `_.property` iteratee shorthand
 * _.uniqBy([{ 'x': 1 }, { 'x': 2 }, { 'x': 1 }], 'x');
 * // => [{ 'x': 1 }, { 'x': 2 }]
 *
 * Based on: https://stackoverflow.com/a/40808569/4919972
 */
export function _uniqBy<T>(arr: readonly T[], mapper: Mapper<T, any>): T[] {
  const map = new Map<any, T>()
  for (const item of arr) {
    const key = item === undefined || item === null ? item : mapper(item)
    if (!map.has(key)) map.set(key, item)
  }
  return [...map.values()]
}

/**
 * const a = [
 *  {id: 'id1', a: 'a1'},
 *  {id: 'id2', b: 'b1'},
 * ]
 *
 * _by(a, r => r.id)
 * // => {
 *   id1: {id: 'id1', a: 'a1'},
 *   id2: {id: 'id2', b: 'b1'},
 * }
 *
 * _by(a, r => r.id.toUpperCase())
 * // => {
 *   ID1: {id: 'id1', a: 'a1'},
 *   ID2: {id: 'id2', b: 'b1'},
 * }
 *
 * Returning `undefined` from the Mapper will EXCLUDE the item.
 */
export function _by<T>(items: readonly T[], mapper: Mapper<T, any>): StringMap<T> {
  const map: StringMap<T> = {}
  for (const v of items) {
    const k = mapper(v)
    if (k !== undefined) {
      map[k] = v
    }
  }

  return map
}

/**
 * Map an array of items by a key, that is calculated by a Mapper.
 */
export function _mapBy<ITEM, KEY>(
  items: readonly ITEM[],
  mapper: Mapper<ITEM, KEY>,
): Map<KEY, ITEM> {
  const map = new Map<KEY, ITEM>()
  for (const item of items) {
    const key = mapper(item)
    if (key !== undefined) {
      map.set(key, item)
    }
  }
  return map
}

/**
 * const a = [1, 2, 3, 4, 5]
 *
 * _groupBy(a, r => r % 2 ? 'even' : 'odd')
 * // => {
 *   odd: [1, 3, 5],
 *   even: [2, 4],
 * }
 *
 * Returning `undefined` from the Mapper will EXCLUDE the item.
 */
export function _groupBy<T>(items: readonly T[], mapper: Mapper<T, any>): StringMap<T[]> {
  const map: StringMap<T[]> = {}

  for (const item of items) {
    const key = mapper(item)
    if (key !== undefined) {
      ;(map[key] ||= []).push(item)
    }
  }
  return map
}

/**
 * Similar to `Array.find`, but the `predicate` may return `END` to stop the iteration early.
 *
 * Use `Array.find` if you don't need to stop the iteration early.
 */
export function _find<T>(items: readonly T[], predicate: AbortablePredicate<T>): T | undefined {
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!
    const result = predicate(item, i)
    if (result === END) return
    if (result) return item
  }
}

/**
 * Similar to `Array.findLast`, but the `predicate` may return `END` to stop the iteration early.
 *
 * Use `Array.findLast` if you don't need to stop the iteration early, which is supported:
 * - in Node since 18+
 * - in iOS Safari since 15.4
 */
export function _findLast<T>(items: readonly T[], predicate: AbortablePredicate<T>): T | undefined {
  return _find(items.slice().reverse(), predicate)
}

export function _takeWhile<T>(items: readonly T[], predicate: Predicate<T>): T[] {
  let proceed = true
  return items.filter((v, index) => (proceed &&= predicate(v, index)))
}

export function _takeRightWhile<T>(items: readonly T[], predicate: Predicate<T>): T[] {
  let proceed = true
  return [...items].reverse().filter((v, index) => (proceed &&= predicate(v, index)))
}

export function _dropWhile<T>(items: readonly T[], predicate: Predicate<T>): T[] {
  let proceed = false
  return items.filter((v, index) => (proceed ||= !predicate(v, index)))
}

export function _dropRightWhile<T>(items: readonly T[], predicate: Predicate<T>): T[] {
  let proceed = false
  return [...items]
    .reverse()
    .filter((v, index) => (proceed ||= !predicate(v, index)))
    .reverse()
}

/**
 * Returns true if the _count >= limit.
 * _count counts how many times the Predicate returns true, and stops
 * when it reaches the limit.
 */
export function _countAtLeast<T>(
  items: Iterable<T>,
  predicate: AbortablePredicate<T>,
  limit: number,
): boolean {
  return _count(items, predicate, limit) >= limit
}

/**
 * Returns true if the _count <> limit.
 * _count counts how many times the Predicate returns true, and stops
 * when it reaches the limit.
 */
export function _countLessThan<T>(
  items: Iterable<T>,
  predicate: AbortablePredicate<T>,
  limit: number,
): boolean {
  return _count(items, predicate, limit) < limit
}

/**
 * Counts how many items match the predicate.
 *
 * `limit` allows to exit early when limit count is reached, skipping further iterations (perf optimization).
 */
export function _count<T>(
  items: Iterable<T>,
  predicate: AbortablePredicate<T>,
  limit?: number,
): number {
  if (limit === 0) return 0
  let count = 0
  let i = 0

  for (const item of items) {
    const r = predicate(item, i++)
    if (r === END) break
    if (r) {
      count++
      if (limit && count >= limit) break
    }
  }

  return count
}

export function _countBy<T>(items: Iterable<T>, mapper: Mapper<T, any>): StringMap<number> {
  const map: StringMap<number> = {}

  for (const item of items) {
    const key = mapper(item)
    map[key] = (map[key] || 0) + 1
  }

  return map
}

// investigate: _groupBy

/**
 * Returns an intersection between 2 arrays.
 *
 * Intersecion means an array of items that are present in both of the arrays.
 *
 * It's more performant to pass a Set as a second argument.
 *
 * @example
 * _intersection([2, 1], [2, 3])
 * // [2]
 */
export function _intersection<T>(a1: T[], a2: T[] | Set<T>): T[] {
  const a2set = a2 instanceof Set ? a2 : new Set(a2)
  return a1.filter(v => a2set.has(v))
}

/**
 * Returns true if there is at least 1 item common between 2 arrays.
 * Otherwise returns false.
 *
 * It's more performant to use that versus `_intersection(a1, a2).length > 0`.
 *
 * Passing second array as Set is more performant (it'll skip turning the array into Set in-place).
 */
export function _intersectsWith<T>(a1: T[], a2: T[] | Set<T>): boolean {
  const a2set = a2 instanceof Set ? a2 : new Set(a2)
  return a1.some(v => a2set.has(v))
}

/**
 * Returns array1 minus array2.
 *
 * @example
 * _difference([2, 1], [2, 3])
 * // [1]
 *
 * Passing second array as Set is more performant (it'll skip turning the array into Set in-place).
 */
export function _difference<T>(a1: T[], a2: T[] | Set<T>): T[] {
  const a2set = a2 instanceof Set ? a2 : new Set(a2)
  return a1.filter(v => !a2set.has(v))
}

/**
 * Returns the sum of items, or 0 for empty array.
 */
export function _sum<N extends number>(items: Iterable<N>): N {
  let sum = 0 as N
  for (const n of items) {
    sum = (sum + n) as N
  }
  return sum
}

export function _sumBy<T, N extends number>(
  items: Iterable<T>,
  mapper: Mapper<T, N | undefined>,
): N {
  let sum = 0 as N

  for (const n of items) {
    const v = mapper(n)
    if (typeof v === 'number') {
      // count only numbers, nothing else
      sum = (sum + v) as N
    }
  }

  return sum
}

/**
 * Map an array of T to a StringMap<V>,
 * by returning a tuple of [key, value] from a mapper function.
 * Return undefined/null/false/0/void to filter out (not include) a value.
 *
 * @example
 *
 * _mapToObject([1, 2, 3], n => [n, n * 2])
 * // { '1': 2, '2': 4, '3': 6 }
 *
 * _mapToObject([1, 2, 3], n => [n, `id${n}`])
 * // { '1': 'id1, '2': 'id2', '3': 'id3' }
 */
export function _mapToObject<T, V>(
  array: Iterable<T>,
  mapper: (item: T) => [key: any, value: V] | FalsyValue,
): StringMap<V> {
  const m: StringMap<V> = {}

  for (const item of array) {
    const r = mapper(item)
    if (!r) continue // filtering

    m[r[0]] = r[1]
  }

  return m
}

/**
 * Randomly shuffle an array values.
 * Fisher–Yates algorithm.
 * Based on: https://stackoverflow.com/a/12646864/4919972
 */
export function _shuffle<T>(array: T[], opt: MutateOptions = {}): T[] {
  const a = opt.mutate ? array : [...array]

  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }

  return a
}

/**
 * Returns last item of non-empty array.
 * Throws if array is empty.
 */
export function _last<T>(array: readonly T[]): T {
  if (!array.length) throw new Error('_last called on empty array')
  return array[array.length - 1]!
}

/**
 * Returns last item of the array (or undefined if array is empty).
 */
export function _lastOrUndefined<T>(array: readonly T[]): T | undefined {
  return array[array.length - 1]
}

/**
 * Returns the first item of non-empty array.
 * Throws if array is empty.
 */
export function _first<T>(array: readonly T[]): T {
  if (!array.length) throw new Error('_first called on empty array')
  return array[0]!
}

/**
 * Returns first item of the array (or undefined if array is empty).
 */
export function _firstOrUndefined<T>(array: readonly T[]): T | undefined {
  return array[0]
}

export function _minOrUndefined<T>(array: readonly T[]): NonNullable<T> | undefined {
  let min: NonNullable<T> | undefined
  for (const item of array) {
    if (item === undefined || item === null) continue
    if (min === undefined || item < min) {
      min = item as NonNullable<T>
    }
  }
  return min
}

/**
 * Filters out nullish values (undefined and null).
 */
export function _min<T>(array: readonly T[]): NonNullable<T> {
  const min = _minOrUndefined(array)
  _assert(min !== undefined, '_min called on empty array')
  return min
}

export function _maxOrUndefined<T>(array: readonly T[]): NonNullable<T> | undefined {
  let max: NonNullable<T> | undefined
  for (const item of array) {
    if (item === undefined || item === null) continue
    if (max === undefined || item > max) {
      max = item as NonNullable<T>
    }
  }
  return max
}

/**
 * Filters out nullish values (undefined and null).
 */
export function _max<T>(array: readonly T[]): NonNullable<T> {
  const max = _maxOrUndefined(array)
  _assert(max !== undefined, '_max called on empty array')
  return max
}

export function _maxBy<T>(array: readonly T[], mapper: Mapper<T, number | string | undefined>): T {
  const max = _maxByOrUndefined(array, mapper)
  _assert(max !== undefined, '_maxBy returned undefined')
  return max
}

export function _minBy<T>(array: readonly T[], mapper: Mapper<T, number | string | undefined>): T {
  const min = _minByOrUndefined(array, mapper)
  _assert(min !== undefined, '_minBy returned undefined')
  return min
}

// todo: looks like it _maxByOrUndefined/_minByOrUndefined can be DRYer

export function _maxByOrUndefined<T>(
  array: readonly T[],
  mapper: Mapper<T, number | string | undefined>,
): T | undefined {
  if (!array.length) return
  let maxItem: T | undefined
  let max: number | string | undefined

  for (const item of array) {
    const v = mapper(item)
    if (v !== undefined && (max === undefined || v > max)) {
      maxItem = item
      max = v
    }
  }

  return maxItem
}

export function _minByOrUndefined<T>(
  array: readonly T[],
  mapper: Mapper<T, number | string | undefined>,
): T | undefined {
  if (!array.length) return
  let minItem: T | undefined
  let min: number | string | undefined

  for (const item of array) {
    const v = mapper(item)
    if (v !== undefined && (min === undefined || v < min)) {
      minItem = item
      min = v
    }
  }

  return minItem
}

export function _zip<T1, T2>(array1: readonly T1[], array2: readonly T2[]): [T1, T2][] {
  const len = Math.min(array1.length, array2.length)
  const res: [T1, T2][] = []

  for (let i = 0; i < len; i++) {
    res.push([array1[i]!, array2[i]!])
  }

  return res
}
