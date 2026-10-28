import { expect, it } from 'vitest'
import { _rangeAsyncIterable } from '../array/range.js'
import { END, SKIP } from '../types.js'
import { AsyncIterable2 } from './asyncIterable2.js'

it('should find, test, filter, map and iterate an async range with sync callbacks', async () => {
  expect(await _rangeAsyncIterable(3).toArray()).toEqual([0, 1, 2])

  expect(await _rangeAsyncIterable(1, 4).findSync(v => v % 2 === 0)).toBe(2)
  expect(await _rangeAsyncIterable(1, 4).someSync(v => v % 2 === 0)).toBe(true)
  expect(await _rangeAsyncIterable(1, 4).someSync(v => v % 2 === -1)).toBe(false)
  expect(await _rangeAsyncIterable(1, 4).everySync(v => v % 2 === 0)).toBe(false)
  expect(await _rangeAsyncIterable(1, 4).everySync(v => v > 0)).toBe(true)

  expect(
    await _rangeAsyncIterable(1, 4)
      .filterSync(v => v % 2 === 1)
      .toArray(),
  ).toEqual([1, 3])

  expect(
    await _rangeAsyncIterable(1, 4)
      .mapSync(v => v * 2)
      .toArray(),
  ).toEqual([2, 4, 6])

  const a: number[] = []
  await _rangeAsyncIterable(1, 4).forEach(v => a.push(v))
  expect(a).toEqual([1, 2, 3])

  expect(await AsyncIterable2.ofIterable([]).toArray()).toEqual([])
  expect(await AsyncIterable2.empty().toArray()).toEqual([])
  expect(await AsyncIterable2.ofIterable([3, 4]).toArray()).toEqual([3, 4])
})

it('should find, test, filter and map an async range with async callbacks', async () => {
  expect(await _rangeAsyncIterable(1, 4).find(async v => v % 2 === 0)).toBe(2)
  expect(await _rangeAsyncIterable(1, 4).find(async v => v > 3)).toBeUndefined()
  expect(await _rangeAsyncIterable(1, 4).some(async v => v % 2 === 0)).toBe(true)
  expect(await _rangeAsyncIterable(1, 4).some(async v => v > 3)).toBe(false)
  expect(await _rangeAsyncIterable(1, 4).every(async v => v % 2 === 0)).toBe(false)
  expect(await _rangeAsyncIterable(1, 4).every(async v => v > 0)).toBe(true)

  expect(
    await _rangeAsyncIterable(1, 4)
      .filter(async v => v % 2 === 1)
      .toArray(),
  ).toEqual([1, 3])

  expect(
    await _rangeAsyncIterable(1, 4)
      .map(async v => v * 2)
      .toArray(),
  ).toEqual([2, 4, 6])
})

it('should stop iterating at END and drop the SKIP results', async () => {
  const visited: number[] = []
  await _rangeAsyncIterable(1, 4).forEach(v => {
    visited.push(v)
    if (v === 2) return END
  })
  expect(visited).toEqual([1, 2])

  expect(await _rangeAsyncIterable(1, 4).find(async v => (v === 2 ? END : v === 3))).toBeUndefined()
  expect(await _rangeAsyncIterable(1, 4).findSync(v => (v === 2 ? END : v === 3))).toBeUndefined()
  expect(await _rangeAsyncIterable(1, 4).every(async v => (v === 2 ? END : true))).toBe(false)
  expect(await _rangeAsyncIterable(1, 4).everySync(v => (v === 2 ? END : true))).toBe(false)

  expect(
    await _rangeAsyncIterable(1, 4)
      .filter(async v => (v === 3 ? END : true))
      .toArray(),
  ).toEqual([1, 2])
  expect(
    await _rangeAsyncIterable(1, 4)
      .filterSync(v => (v === 3 ? END : true))
      .toArray(),
  ).toEqual([1, 2])

  expect(
    await _rangeAsyncIterable(1, 5)
      .map(async v => doubleSkippingOneUntilFour(v))
      .toArray(),
  ).toEqual([4, 6])
  expect(await _rangeAsyncIterable(1, 5).mapSync(doubleSkippingOneUntilFour).toArray()).toEqual([
    4, 6,
  ])
})

function doubleSkippingOneUntilFour(v: number): number | typeof SKIP | typeof END {
  if (v === 4) return END
  if (v === 1) return SKIP
  return v * 2
}
