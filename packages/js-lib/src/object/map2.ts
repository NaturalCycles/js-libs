/**
 * Like Map, but serializes to JSON as an object.
 *
 * Fixes the "issue" of stock Map being json-serialized as `{}`.
 *
 * @experimental
 */
export class Map2<K = any, V = any> extends Map<K, V> {
  /**
   * Convenience way to create Map2 from object.
   */
  static of<V>(obj: Record<any, V>): Map2<string, V> {
    return new Map2(Object.entries(obj))
  }

  /**
   * Allows to set multiple key-value pairs at once.
   */
  setMany(obj: Record<any, V>): this {
    for (const [k, v] of Object.entries(obj)) {
      this.set(k as K, v)
    }
    return this
  }

  toObject(): Record<string, V> {
    return Object.fromEntries(this)
  }

  toJSON(): Record<string, V> {
    return Object.fromEntries(this)
  }

  override toString(): string {
    return `Map2(${this.size}) ${JSON.stringify(Object.fromEntries(this))}`
  }

  // consider more helpful .toString() ?
}
