import { _assert } from '../error/assert.js'
import { _shuffle } from './array.util.js'

/**
 * Better Array.
 *
 * @experimental
 */
export class Array2<T> extends Array<T> {
  static override of<T>(...items: T[]): Array2<T> {
    return new Array2(...items)
  }

  // oxlint-disable-next-line @typescript-eslint/class-literal-property-style
  get [Symbol.toStringTag](): string {
    return 'Array2'
  }

  firstOrUndefined(): T | undefined {
    return this[0]
  }

  first(): T {
    _assert(this.length, 'Array.first called on empty array')
    return this[0]!
  }

  lastOrUndefined(): T | undefined {
    return this[this.length - 1]
  }

  last(): T {
    const { length } = this
    _assert(length, 'Array.last called on empty array')
    return this[length - 1]!
  }

  uniq(): Array2<T> {
    return new Array2<T>(...new Set(this))
  }

  shuffle(): Array2<T> {
    return new Array2(..._shuffle(this))
  }

  isEmpty(): boolean {
    return this.length === 0
  }

  isNotEmpty(): boolean {
    return this.length !== 0
  }
}
