import { _average, _percentile, _percentiles } from './math.util.js'

/**
 * Implements a "round-robin" Stack ("first-in last-out" aka FILO) with a limited size.
 * Like an array of a fixed size. When it runs out of space - it starts writing on top of itself
 * from index 0.
 *
 *
 */
export class Stack<T> {
  constructor(public readonly size: number) {}

  /**
   * Index of a slot to get written TO next.
   * Currently this slot contains OLDEST item (if any).
   */
  private nextIndex = 0

  private readonly buffer: T[] = []

  /**
   * Raw "items buffer" as-is (not ordered properly).
   * Readonly, because mutating it (e.g sorting in-place) would corrupt the Stack.
   */
  get items(): readonly T[] {
    return this.buffer
  }

  push(item: T): this {
    this.buffer[this.nextIndex] = item
    this.nextIndex = this.nextIndex === this.size - 1 ? 0 : this.nextIndex + 1
    return this
  }

  /**
   * Fill (overwrite) the whole Stack (all its items) with the passed `item`.
   */
  fill(item: T): this {
    for (let i = 0; i < this.size; i++) {
      this.buffer[i] = item
    }
    return this
  }

  /**
   * Returns last items in the right order.
   * Unlike raw `items` property that returns "items buffer" as-is (not ordered properly).
   */
  get itemsOrdered(): readonly T[] {
    if (this.buffer.length < this.size) {
      // Buffer is not filled yet, just return it as-is
      return this.buffer
    }

    // Buffer was filled and started to "overwrite itself", will need to return 2 slices
    return [...this.buffer.slice(this.nextIndex), ...this.buffer.slice(0, this.nextIndex)]
  }
}

/**
 * Fixed-size FILO stack of Numbers.
 * Has convenience stat methods, e.g percentile, avg, etc.
 */
export class NumberStack extends Stack<number> {
  avg(): number {
    // _assert(this.items.length, 'NumberStack.avg cannot be called on empty stack')
    return _average(this.items)
  }

  /**
   * Returns null if Stack is empty.
   */
  avgOrNull(): number | null {
    return this.items.length === 0 ? null : _average(this.items)
  }

  median(): number {
    return _percentile(this.items, 50)
  }

  medianOrNull(): number | null {
    return this.items.length === 0 ? null : _percentile(this.items, 50)
  }

  /**
   * `pc` is a number from 0 to 100 inclusive.
   */
  percentile(pc: number): number {
    // _assert(this.items.length, 'NumberStack.percentile cannot be called on empty stack')
    return _percentile(this.items, pc)
  }

  /**
   * `pc` is a number from 0 to 100 inclusive.
   * Returns null if Stack is empty.
   */
  percentileOrNull(pc: number): number | null {
    return this.items.length === 0 ? null : _percentile(this.items, pc)
  }

  percentiles(pcs: readonly number[]): Record<number, number> {
    return _percentiles(this.items, pcs)
  }
}
