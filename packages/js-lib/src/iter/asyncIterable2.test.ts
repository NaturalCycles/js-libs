import { expect, test } from 'vitest'
import { _rangeAsyncIterable } from '../array/range.js'
import { AsyncIterable2 } from './asyncIterable2.js'

test('asyncIterable2', async () => {
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
