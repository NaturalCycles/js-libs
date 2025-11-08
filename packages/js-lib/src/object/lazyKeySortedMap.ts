import { _assert } from '../error/index.js'
import type { Comparator } from '../types.js'

export interface LazyKeySortedMapOptions<K> {
  /**
   * Defaults to undefined.
   * Undefined (default comparator) works well for String keys.
   * For Number keys - use comparators.numericAsc (or desc),
   * otherwise sorting will be wrong (lexicographic).
   */
  comparator?: Comparator<K>
}

/**
 * Maintains sorted array of keys.
 * Sorts **data access**, not on insertion.
 *
 * @experimental
 */
export class LazyKeySortedMap<K, V> implements Map<K, V> {
  private readonly map: Map<K, V>
  private readonly maybeSortedKeys: K[]
  private keysAreSorted = false

  constructor(entries: [K, V][] = [], opt: LazyKeySortedMapOptions<K> = {}) {
    this.#comparator = opt.comparator
    this.map = new Map(entries)
    this.maybeSortedKeys = [...this.map.keys()]
  }

  readonly #comparator: Comparator<K> | undefined

  /**
   * Convenience way to create KeySortedMap from object.
   */
  static of<V>(obj: Record<any, V>): LazyKeySortedMap<string, V> {
    return new LazyKeySortedMap(Object.entries(obj))
  }

  get size(): number {
    return this.map.size
  }

  clear(): void {
    this.map.clear()
    this.maybeSortedKeys.length = 0
    this.keysAreSorted = true
  }

  has(key: K): boolean {
    return this.map.has(key)
  }

  get(key: K): V | undefined {
    return this.map.get(key)
  }

  /**
   * Allows to set multiple key-value pairs at once.
   */
  setMany(obj: Record<any, V>): this {
    for (const [k, v] of Object.entries(obj)) {
      this.map.set(k as K, v)
      this.maybeSortedKeys.push(k as K)
    }
    this.keysAreSorted = false
    return this
  }

  /**
   * Insert or update. Keeps keys array sorted at all times.
   * Returns this (Map-like).
   */
  set(key: K, value: V): this {
    if (!this.map.has(key)) {
      this.maybeSortedKeys.push(key)
      this.keysAreSorted = false
    }
    this.map.set(key, value)
    return this
  }

  /**
   * Delete by key. Returns boolean like Map.delete.
   */
  delete(key: K): boolean {
    if (!this.map.has(key)) return false
    this.map.delete(key)
    // Delete operation keeps the array **as-is**, it may have been sorted or not.
    const j = this.maybeSortedKeys.indexOf(key)
    if (j !== -1) this.maybeSortedKeys.splice(j, 1)
    return true
  }

  /**
   * Iterables (Map-compatible), all in sorted order.
   */
  *keys(): MapIterator<K> {
    for (const key of this.getSortedKeys()) {
      yield key
    }
  }

  *values(): MapIterator<V> {
    for (const key of this.getSortedKeys()) {
      yield this.map.get(key)!
    }
  }

  *entries(): MapIterator<[K, V]> {
    for (const k of this.getSortedKeys()) {
      yield [k, this.map.get(k)!]
    }
  }

  [Symbol.iterator](): MapIterator<[K, V]> {
    return this.entries()
  }

  [Symbol.toStringTag] = 'KeySortedMap'

  /**
   * Zero-allocation callbacks over sorted data (faster than spreading to arrays).
   */
  forEach(cb: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
    const { map } = this
    for (const k of this.getSortedKeys()) {
      cb.call(thisArg, map.get(k)!, k, this)
    }
  }

  firstKeyOrUndefined(): K | undefined {
    return this.getSortedKeys()[0]
  }

  firstKey(): K {
    _assert(this.maybeSortedKeys.length, 'Map.firstKey called on empty map')
    return this.getSortedKeys()[0]!
  }

  lastKeyOrUndefined(): K | undefined {
    if (!this.maybeSortedKeys.length) return
    const keys = this.getSortedKeys()
    return keys[keys.length - 1]
  }

  lastKey(): K {
    const k = this.lastKeyOrUndefined()
    _assert(k, 'Map.lastKey called on empty map')
    return k
  }

  firstValueOrUndefined(): V | undefined {
    if (!this.maybeSortedKeys.length) return
    return this.map.get(this.getSortedKeys()[0]!)
  }

  firstValue(): V {
    const v = this.firstValueOrUndefined()
    _assert(v, 'Map.firstValue called on empty map')
    return v
  }

  lastValueOrUndefined(): V | undefined {
    if (!this.maybeSortedKeys.length) return
    const keys = this.getSortedKeys()
    return this.map.get(keys[keys.length - 1]!)
  }

  lastValue(): V {
    const v = this.lastValueOrUndefined()
    _assert(v, 'Map.lastValue called on empty map')
    return v
  }

  firstEntryOrUndefined(): [K, V] | undefined {
    if (!this.maybeSortedKeys.length) return
    const k = this.getSortedKeys()[0]!
    return [k, this.map.get(k)!]
  }

  firstEntry(): [K, V] {
    const e = this.firstEntryOrUndefined()
    _assert(e, 'Map.firstEntry called on empty map')
    return e
  }

  lastEntryOrUndefined(): [K, V] | undefined {
    if (!this.maybeSortedKeys.length) return
    const keys = this.getSortedKeys()
    const k = keys[keys.length - 1]!
    return [k, this.map.get(k)!]
  }

  lastEntry(): [K, V] {
    const e = this.firstEntryOrUndefined()
    _assert(e, 'Map.lastEntry called on empty map')
    return e
  }

  toJSON(): Record<string, V> {
    return this.toObject()
  }

  toObject(): Record<string, V> {
    return Object.fromEntries(this.entries())
  }

  private getSortedKeys(): K[] {
    if (!this.keysAreSorted) {
      return this.sortKeys()
    }
    return this.maybeSortedKeys
  }

  private sortKeys(): K[] {
    this.maybeSortedKeys.sort(this.#comparator)
    this.keysAreSorted = true
    return this.maybeSortedKeys
  }
}
