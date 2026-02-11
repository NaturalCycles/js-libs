import { _stringMapValues } from '../types.js'
import type { Comparator, Mapper, SortDirection, SortOptions, StringMap } from '../types.js'

class Comparators {
  /**
   * Good for numbers.
   */
  numericAsc(this: void, a: number, b: number): number {
    return a - b
  }

  numericDesc(this: void, a: number, b: number): number {
    return b - a
  }

  localeAsc(this: void, a: string, b: string): number {
    return a.localeCompare(b)
  }

  localeDesc(this: void, a: string, b: string): number {
    return -a.localeCompare(b)
  }

  by<T, COMPARE_TYPE extends string | number>(
    this: void,
    mapper: Mapper<T, COMPARE_TYPE>,
    opt: ComparatorByOptions = {},
  ): Comparator<T> {
    const mod = opt.dir === 'desc' ? -1 : 1
    return (objA: T, objB: T): number => {
      // This implementation may call mapper more than once per item,
      // but the benchmarks show no significant difference in performance.
      const a = mapper(objA)
      const b = mapper(objB)
      if (a > b) return mod
      if (a < b) return -mod
      return 0
    }
  }

  updatedAsc(this: void, a: { updated: number }, b: { updated: number }): number {
    return a.updated - b.updated
  }

  updatedDesc(this: void, a: { updated: number }, b: { updated: number }): number {
    return b.updated - a.updated
  }

  createdAsc(this: void, a: { created: number }, b: { created: number }): number {
    return a.created - b.created
  }

  createdDesc(this: void, a: { created: number }, b: { created: number }): number {
    return b.created - a.created
  }
}

export const comparators = new Comparators()

interface ComparatorByOptions {
  /**
   * Defaults to 'asc'.
   */
  dir?: SortDirection
}

/**
 * _sortBy([{age: 20}, {age: 10}], 'age')
 * // => [{age: 10}, {age: 20}]
 *
 * Same:
 * _sortBy([{age: 20}, {age: 10}], o => o.age)
 */
export function _sortBy<T, COMPARE_TYPE extends string | number>(
  items: T[],
  mapper: Mapper<T, COMPARE_TYPE>,
  opt: SortOptions = {},
): T[] {
  return (opt.mutate ? items : [...items]).sort(comparators.by(mapper, opt))
}

/**
 * Like _stringMapValues, but values are sorted.
 */
export function _stringMapValuesSorted<T>(
  map: StringMap<T>,
  mapper: Mapper<T, any>,
  dir: SortDirection = 'asc',
): T[] {
  return _sortBy(_stringMapValues(map), mapper, { dir })
}
