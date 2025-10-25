import { Set2 } from '../object/index.js'
import type { Comparator } from '../types.js'

export interface SortedSetOptions<T> {
  /**
   * Defaults to undefined.
   * Undefined (default comparator) works well for String keys.
   * For Number keys - use comparators.numericAsc (or desc),
   * otherwise sorting will be wrong (lexicographic).
   */
  comparator?: Comparator<T>
}

/**
 * Like Set, but keeps members sorted after every insertion.
 */
export class SortedSet<T> extends Set2<T> {
  constructor(values: Iterable<T> = [], opt: SortedSetOptions<T> = {}) {
    super()
    this.#comparator = opt.comparator
    this.addMany(values)
  }

  readonly #comparator: Comparator<T> | undefined

  override add(value: T): this {
    if (super.has(value)) {
      return this
    }
    super.add(value)
    return this.recreate()
  }

  override addMany(items: Iterable<T>): this {
    for (const item of items) {
      super.add(item)
    }
    return this.recreate()
  }

  private recreate(): this {
    const items = Array.from(super.values())
    items.sort(this.#comparator)
    super.clear()
    for (const item of items) {
      super.add(item)
    }
    return this
  }

  override get [Symbol.toStringTag](): string {
    return 'Set'
  }
}
