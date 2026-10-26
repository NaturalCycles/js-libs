import { expect, it } from 'vitest'
import { _rangeIterable } from '../array/range.js'
import { Iterable2 } from './iterable2.js'

it('iterable2', () => {
  expect(_rangeIterable(3).toArray()).toEqual([0, 1, 2])

  expect(_rangeIterable(1, 4).find(v => v % 2 === 0)).toBe(2)
  expect(_rangeIterable(1, 4).some(v => v % 2 === 0)).toBe(true)
  expect(_rangeIterable(1, 4).some(v => v % 2 === -1)).toBe(false)
  expect(_rangeIterable(1, 4).every(v => v % 2 === 0)).toBe(false)
  expect(_rangeIterable(1, 4).every(v => v > 0)).toBe(true)

  expect(
    _rangeIterable(1, 4)
      .filter(v => v % 2 === 1)
      .toArray(),
  ).toEqual([1, 3])

  expect(
    _rangeIterable(1, 4)
      .map(v => v * 2)
      .toArray(),
  ).toEqual([2, 4, 6])

  const a: number[] = []
  _rangeIterable(1, 4).forEach(v => a.push(v))
  expect(a).toEqual([1, 2, 3])

  expect(Iterable2.of([]).toArray()).toEqual([])
  expect(Iterable2.empty().toArray()).toEqual([])
  expect(Iterable2.of([3, 4]).toArray()).toEqual([3, 4])
})
