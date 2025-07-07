import { AsyncIterable2 } from '../iter/asyncIterable2.js'
import { Iterable2 } from '../iter/iterable2.js'

/**
 * Returns an array with ranges from `from` up to (but not including) `to`.
 *
 * Right bound is Exclusive (not Inclusive), to comply with lodash _.range
 *
 * @example
 * range(3) // [0, 1, 2]
 * range(3, 6) // [ 3, 4, 5 ]
 * range(1, 10, 2) // [ 1, 3, 5, 7, 9 ]
 */
export function _range(toExcl: number): number[]
export function _range(fromIncl: number, toExcl: number, step?: number): number[]
export function _range(fromIncl: number, toExcl?: number, step = 1): number[] {
  if (toExcl === undefined) {
    toExcl = fromIncl
    fromIncl = 0
  }

  const a: number[] = []
  for (let i = fromIncl; i < toExcl; i += step) {
    a.push(i)
  }
  return a
}

/**
 * Like _range, but returns an Iterable2.
 */
export function _rangeIterable(toExcl: number): Iterable2<number>
export function _rangeIterable(fromIncl: number, toExcl: number, step?: number): Iterable2<number>
export function _rangeIterable(fromIncl: number, toExcl?: number, step = 1): Iterable2<number> {
  if (toExcl === undefined) {
    toExcl = fromIncl
    fromIncl = 0
  }

  return Iterable2.of({
    *[Symbol.iterator]() {
      for (let i = fromIncl; i < toExcl; i += step) {
        yield i
      }
    },
  })
}

/**
 * Like _range, but returns an AsyncIterable2.
 */
export function _rangeAsyncIterable(toExcl: number): AsyncIterable2<number>
export function _rangeAsyncIterable(
  fromIncl: number,
  toExcl: number,
  step?: number,
): AsyncIterable2<number>
export function _rangeAsyncIterable(
  fromIncl: number,
  toExcl?: number,
  step = 1,
): AsyncIterable2<number> {
  if (toExcl === undefined) {
    toExcl = fromIncl
    fromIncl = 0
  }

  return AsyncIterable2.of({
    async *[Symbol.asyncIterator]() {
      for (let i = fromIncl; i < toExcl; i += step) {
        yield i
      }
    },
  })
}
