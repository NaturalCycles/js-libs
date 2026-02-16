import { _assert } from '../error/index.js'
import type { Comparator } from '../types.js'

export interface KeySortedMapOptions<K> {
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
 * Sorts **on insertion**, not on retrieval.
 *
 * - set(): O(log n) search + O(n) splice only when inserting a NEW key
 * - get/has: O(1)
 * - delete: O(log n) search + O(n) splice if present
 * - iteration: O(n) over pre-sorted keys (no sorting at iteration time)
 *
 * @experimental
 */
// oxlint-disable-next-line no-unsafe-declaration-merging -- Map<K,V> workaround for oxlint TS2420 false positive
export interface KeySortedMap<K, V> extends Map<K, V> {}

// oxlint-disable-next-line no-unsafe-declaration-merging -- Map<K,V> workaround for oxlint TS2420 false positive
export class KeySortedMap<K, V> {
  private readonly map: Map<K, V>
  readonly #sortedKeys: K[]

  constructor(entries: [K, V][] = [], opt: KeySortedMapOptions<K> = {}) {
    this.#comparator = opt.comparator
    this.map = new Map(entries)
    this.#sortedKeys = [...this.map.keys()]
    this.sortKeys()
  }

  readonly #comparator: Comparator<K> | undefined

  /**
   * Convenience way to create KeySortedMap from object.
   */
  static of<V>(obj: Record<any, V>): KeySortedMap<string, V> {
    return new KeySortedMap(Object.entries(obj))
  }

  get size(): number {
    return this.map.size
  }

  clear(): void {
    this.map.clear()
    this.#sortedKeys.length = 0
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
      this.#sortedKeys.push(k as K)
    }
    // Resort all at once
    this.sortKeys()
    return this
  }

  /**
   * Insert or update. Keeps keys array sorted at all times.
   * Returns this (Map-like).
   */
  set(key: K, value: V): this {
    if (this.map.has(key)) {
      // Update only; position unchanged.
      this.map.set(key, value)
      return this
    }
    // Find insertion index (lower_bound).
    const i = this.lowerBound(key)
    // Only insert into keys when actually new.
    this.#sortedKeys.splice(i, 0, key)
    this.map.set(key, value)
    return this
  }

  /**
   * Delete by key. Returns boolean like Map.delete.
   */
  delete(key: K): boolean {
    if (!this.map.has(key)) return false
    this.map.delete(key)
    // Remove from keys using binary search to avoid O(n) find.
    const i = this.lowerBound(key)
    // Because key existed, it must be at i.
    if (i < this.#sortedKeys.length && this.#sortedKeys[i] === key) {
      this.#sortedKeys.splice(i, 1)
    } else {
      // Extremely unlikely if external mutation happened; safe guard.
      // Fall back to linear search (shouldn't happen).
      const j = this.#sortedKeys.indexOf(key)
      if (j !== -1) this.#sortedKeys.splice(j, 1)
    }
    return true
  }

  /**
   * Iterables (Map-compatible), all in sorted order.
   */
  *keys(): MapIterator<K> {
    for (const key of this.#sortedKeys) {
      yield key
    }
  }

  *values(): MapIterator<V> {
    for (const key of this.#sortedKeys) {
      yield this.map.get(key)!
    }
  }

  *entries(): MapIterator<[K, V]> {
    for (const k of this.#sortedKeys) {
      yield [k, this.map.get(k)!]
    }
  }

  [Symbol.iterator](): MapIterator<[K, V]> {
    return this.entries()
  }

  toString(): string {
    console.log('toString called !!!!!!!!!!!!!!!!!!!!!')
    return 'abc'
  }

  readonly [Symbol.toStringTag] = 'KeySortedMap'

  /**
   * Zero-allocation callbacks over sorted data (faster than spreading to arrays).
   */
  forEach(cb: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
    const { map } = this
    for (const k of this.#sortedKeys) {
      cb.call(thisArg, map.get(k)!, k, this as unknown as Map<K, V>)
    }
  }

  firstKeyOrUndefined(): K | undefined {
    return this.#sortedKeys[0]
  }

  firstKey(): K {
    _assert(this.#sortedKeys.length, 'Map.firstKey called on empty map')
    return this.#sortedKeys[0]!
  }

  lastKeyOrUndefined(): K | undefined {
    return this.#sortedKeys.length ? this.#sortedKeys[this.#sortedKeys.length - 1] : undefined
  }

  lastKey(): K {
    _assert(this.#sortedKeys.length, 'Map.lastKey called on empty map')
    return this.#sortedKeys[this.#sortedKeys.length - 1]!
  }

  firstValueOrUndefined(): V | undefined {
    return this.map.get(this.#sortedKeys[0]!)
  }

  firstValue(): V {
    _assert(this.#sortedKeys.length, 'Map.firstValue called on empty map')
    return this.map.get(this.#sortedKeys[0]!)!
  }

  lastValueOrUndefined(): V | undefined {
    return this.#sortedKeys.length
      ? this.map.get(this.#sortedKeys[this.#sortedKeys.length - 1]!)
      : undefined
  }

  lastValue(): V {
    _assert(this.#sortedKeys.length, 'Map.lastValue called on empty map')
    return this.map.get(this.#sortedKeys[this.#sortedKeys.length - 1]!)!
  }

  firstEntryOrUndefined(): [K, V] | undefined {
    if (!this.#sortedKeys.length) return
    const k = this.#sortedKeys[0]!
    return [k, this.map.get(k)!]
  }

  firstEntry(): [K, V] {
    _assert(this.#sortedKeys.length, 'Map.firstEntry called on empty map')
    const k = this.#sortedKeys[0]!
    return [k, this.map.get(k)!]
  }

  lastEntryOrUndefined(): [K, V] | undefined {
    if (!this.#sortedKeys.length) return
    const k = this.#sortedKeys[this.#sortedKeys.length - 1]!
    return [k, this.map.get(k)!]
  }

  lastEntry(): [K, V] {
    _assert(this.#sortedKeys.length, 'Map.lastEntry called on empty map')
    const k = this.#sortedKeys[this.#sortedKeys.length - 1]!
    return [k, this.map.get(k)!]
  }

  toJSON(): Record<string, V> {
    return this.toObject()
  }

  toObject(): Record<string, V> {
    return Object.fromEntries(this.entries())
  }

  /**
   * Clones the KeySortedMap into ordinary Map.
   */
  toMap(): Map<K, V> {
    return new Map(this.entries())
  }

  /**
   * lowerBound: first index i s.t. keys[i] >= target
   */
  private lowerBound(target: K): number {
    let lo = 0
    let hi = this.#sortedKeys.length
    while (lo < hi) {
      // oxlint-disable-next-line no-bitwise
      const mid = (lo + hi) >>> 1
      if (this.#sortedKeys[mid]! < target) {
        lo = mid + 1
      } else {
        hi = mid
      }
    }
    return lo
  }

  private sortKeys(): void {
    this.#sortedKeys.sort(this.#comparator)
  }
}
