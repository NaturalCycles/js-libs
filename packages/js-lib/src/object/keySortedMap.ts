export interface KeySortedMapOptions {
  /**
   * Defaults to false.
   * Set to true if your keys are numeric,
   * so it would sort correctly.
   */
  numericKeys?: boolean
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
export class KeySortedMap<K, V> implements Map<K, V> {
  private readonly map: Map<K, V>
  private readonly sortedKeys: K[]

  constructor(
    entries: [K, V][] = [],
    public opt: KeySortedMapOptions = {},
  ) {
    this.map = new Map(entries)
    this.sortedKeys = [...this.map.keys()]
    this.sortKeys()
  }

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
    this.sortedKeys.length = 0
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
      this.sortedKeys.push(k as K)
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
    this.sortedKeys.splice(i, 0, key)
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
    if (i < this.sortedKeys.length && this.sortedKeys[i] === key) {
      this.sortedKeys.splice(i, 1)
    } else {
      // Extremely unlikely if external mutation happened; safe guard.
      // Fall back to linear search (shouldn't happen).
      const j = this.sortedKeys.indexOf(key)
      if (j !== -1) this.sortedKeys.splice(j, 1)
    }
    return true
  }

  /**
   * Iterables (Map-compatible), all in sorted order.
   */
  *keys(): MapIterator<K> {
    for (let i = 0; i < this.sortedKeys.length; i++) {
      yield this.sortedKeys[i]!
    }
  }

  *values(): MapIterator<V> {
    for (let i = 0; i < this.sortedKeys.length; i++) {
      yield this.map.get(this.sortedKeys[i]!)!
    }
  }

  *entries(): MapIterator<[K, V]> {
    for (let i = 0; i < this.sortedKeys.length; i++) {
      const k = this.sortedKeys[i]!
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
    const m = this.map
    for (let i = 0; i < this.sortedKeys.length; i++) {
      const k = this.sortedKeys[i]!
      cb.call(thisArg, m.get(k)!, k, this)
    }
  }

  /**
   * Convenience methods that MATERIALIZE arrays (if you really want arrays).
   * These allocate; use iterators/forEach for maximum performance.
   */
  keysArray(): K[] {
    return this.sortedKeys.slice()
  }

  valuesArray(): V[] {
    // oxlint-disable-next-line unicorn/no-new-array
    const a = Array<V>(this.sortedKeys.length)
    for (let i = 0; i < this.sortedKeys.length; i++) {
      a[i] = this.map.get(this.sortedKeys[i]!)!
    }
    return a
  }

  entriesArray(): [K, V][] {
    // oxlint-disable-next-line unicorn/no-new-array
    const out = Array<[K, V]>(this.sortedKeys.length)
    for (let i = 0; i < this.sortedKeys.length; i++) {
      const k = this.sortedKeys[i]!
      out[i] = [k, this.map.get(k)!]
    }
    return out
  }

  /** Fast helpers */
  firstKey(): K | undefined {
    return this.sortedKeys[0]
  }

  lastKey(): K | undefined {
    return this.sortedKeys.length ? this.sortedKeys[this.sortedKeys.length - 1] : undefined
  }

  firstEntry(): [K, V] | undefined {
    if (!this.sortedKeys.length) return
    const k = this.sortedKeys[0]!
    return [k, this.map.get(k)!]
  }

  lastEntry(): [K, V] | undefined {
    if (!this.sortedKeys.length) return
    const k = this.sortedKeys[this.sortedKeys.length - 1]!
    return [k, this.map.get(k)!]
  }

  toJSON(): Record<string, V> {
    return this.toObject()
  }

  toObject(): Record<string, V> {
    return Object.fromEntries(this.map)
  }

  /**
   * lowerBound: first index i s.t. keys[i] >= target
   */
  private lowerBound(target: K): number {
    let lo = 0
    let hi = this.sortedKeys.length
    while (lo < hi) {
      // oxlint-disable-next-line no-bitwise
      const mid = (lo + hi) >>> 1
      if (this.sortedKeys[mid]! < target) {
        lo = mid + 1
      } else {
        hi = mid
      }
    }
    return lo
  }

  private sortKeys(): void {
    if (this.opt.numericKeys) {
      ;(this.sortedKeys as number[]).sort(numericAscCompare)
    } else {
      // Default sort - fastest for Strings
      this.sortedKeys.sort()
    }
  }
}

function numericAscCompare(a: number, b: number): number {
  return a - b
}
