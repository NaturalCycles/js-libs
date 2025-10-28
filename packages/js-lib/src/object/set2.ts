/**
 * Like Set, but serializes to JSON as an array.
 *
 * Fixes the "issue" of stock Set being json-serialized as `{}`.
 *
 * @experimental
 */
export class Set2<T = any> extends Set<T> {
  static of<T>(items?: Iterable<T> | null): Set2<T> {
    return new Set2(items)
  }

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

  first(): T {
    if (!this.size) throw new Error('Set.first called on empty set')
    return this.firstOrUndefined()!
  }

  firstOrUndefined(): T | undefined {
    return this.values().next().value
  }

  // Last is not implemented, because it requires to traverse the whole Set - not optimal
  // last(): T {

  toArray(): T[] {
    return [...this]
  }

  toJSON(): T[] {
    return [...this]
  }

  override toString(): string {
    return `Set2(${this.size}) ${JSON.stringify([...this])}`
  }

  // todo: consider more helpful .toString() ?
}
