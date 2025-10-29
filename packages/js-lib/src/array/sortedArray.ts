import type { Comparator } from '../types.js'
import { Array2 } from './array2.js'
import { comparators } from './sort.js'

export interface SortedArrayOptions<T> {
  /**
   * Defaults to undefined.
   * Undefined (default comparator) works well for String keys.
   * For Number keys - use comparators.numericAsc (or desc),
   * otherwise sorting will be wrong (lexicographic).
   */
  comparator?: Comparator<T>
}

/**
 * Like Array, but keeps values sorted after every insertion.
 */
export class SortedArray<T> extends Array2<T> {
  constructor(values: Iterable<T> = [], opt: SortedArrayOptions<T> = {}) {
    super(...values)
    this.#comparator = opt.comparator
    this.resort()
  }

  readonly #comparator: Comparator<T> | undefined

  override push(...values: T[]): number {
    const length = super.push(...values)
    this.resort()
    return length
  }

  override unshift(...values: T[]): number {
    const length = super.unshift(...values)
    this.resort()
    return length
  }

  override splice(start: number, deleteCount?: number, ...items: T[]): T[] {
    const removed = super.splice(start, deleteCount ?? this.length - start, ...items)
    if (items.length) {
      this.resort()
    }
    return removed
  }

  static override get [Symbol.species](): ArrayConstructor {
    return Array
  }

  override get [Symbol.toStringTag](): string {
    return 'Array'
  }

  private resort(): void {
    super.sort(this.#comparator)
  }
}

export class SortedStringArray extends SortedArray<string> {
  constructor(values: Iterable<string> = []) {
    super(values)
  }

  override get [Symbol.toStringTag](): string {
    return 'Array'
  }
}

export class SortedNumberArray extends SortedArray<number> {
  constructor(values: Iterable<number> = []) {
    super(values, { comparator: comparators.numericAsc })
  }

  override get [Symbol.toStringTag](): string {
    return 'Array'
  }
}
