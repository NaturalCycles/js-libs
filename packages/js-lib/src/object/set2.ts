/**
 * Like Set, but serializes to JSON as an array.
 *
 * Fixes the "issue" of stock Set being json-serialized as `{}`.
 *
 * @experimental
 */
export class Set2<T = any> extends Set<T> {
  /**
   * Like .add(), but allows to add multiple items at once.
   * Mutates the Set, but also returns it conveniently.
   */
  addMany(items: Iterable<T>): this {
    for (const item of items) {
      this.add(item)
    }
    return this
  }

  toArray(): T[] {
    return [...this]
  }

  toJSON(): T[] {
    return [...this]
  }

  // consider more helpful .toString() ?
}
