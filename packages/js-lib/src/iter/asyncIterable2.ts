import type { AbortableAsyncMapper, AbortableAsyncPredicate, Promisable } from '../types.js'
import { END, SKIP } from '../types.js'

/**
 * Similar to Iterable2, but for AsyncIterable.
 *
 * AsyncIterable2 is a wrapper around AsyncIterable that implements "Iterator Helpers proposal":
 * https://github.com/tc39/proposal-iterator-helpers
 *
 * AsyncIterable2 can be removed after the proposal is widely implemented in Node & browsers.
 *
 * @experimental
 */
export class AsyncIterable2<T> implements AsyncIterable<T> {
  private constructor(private it: AsyncIterable<T>) {}

  static of<T>(it: AsyncIterable<T>): AsyncIterable2<T> {
    return new AsyncIterable2(it)
  }

  static ofIterable<T>(it: Iterable<T>): AsyncIterable2<T> {
    return new AsyncIterable2<T>({
      async *[Symbol.asyncIterator]() {
        yield* it
      },
    })
  }

  static empty<T>(): AsyncIterable2<T> {
    return new AsyncIterable2<T>({
      async *[Symbol.asyncIterator]() {},
    })
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return this.it[Symbol.asyncIterator]()
  }

  async toArray(): Promise<T[]> {
    // todo: Array.fromAsync is not yet available, use that when it's ready
    // return await Array.fromAsync(this.it)

    const res: T[] = []
    for await (const item of this.it) {
      res.push(item)
    }
    return res
  }

  async forEach(cb: (v: T, i: number) => Promisable<any | typeof END>): Promise<void> {
    let i = 0
    for await (const v of this.it) {
      if ((await cb(v, i++)) === END) return
    }
  }

  async some(cb: AbortableAsyncPredicate<T>): Promise<boolean> {
    return !!(await this.find(cb))
  }

  async every(cb: AbortableAsyncPredicate<T>): Promise<boolean> {
    let i = 0
    for await (const v of this.it) {
      const r = await cb(v, i++)
      if (r === END || !r) return false
    }
    return true
  }

  async find(cb: AbortableAsyncPredicate<T>): Promise<T | undefined> {
    let i = 0
    for await (const v of this.it) {
      const r = await cb(v, i++)
      if (r === END) return
      if (r) return v
    }
  }

  filter(cb: AbortableAsyncPredicate<T>): AsyncIterable2<T> {
    const { it } = this

    return new AsyncIterable2<T>({
      async *[Symbol.asyncIterator]() {
        let i = 0
        for await (const v of it) {
          const r = await cb(v, i++)
          if (r === END) return
          if (r) yield v
        }
      },
    })
  }

  map<OUT>(mapper: AbortableAsyncMapper<T, OUT>): AsyncIterable2<OUT> {
    const { it } = this

    return new AsyncIterable2<OUT>({
      async *[Symbol.asyncIterator]() {
        let i = 0
        for await (const v of it) {
          const r = await mapper(v, i++)
          if (r === END) return
          if (r === SKIP) continue
          yield r
        }
      },
    })
  }
}
