import { expect, it } from 'vitest'
import type { UnixTimestamp } from '../types.js'
import { TimeInterval } from './timeInterval.js'

it('basic', () => {
  const str1 = '1649267185/1649267187'
  const int1 = TimeInterval.parse(str1)
  expect(int1.toString()).toBe(str1)
  expect(JSON.stringify(int1)).toBe(`"${str1}"`)
  expect(int1.startTime.isSame(1649267185 as UnixTimestamp)).toBe(true)
  expect(int1.endTime.isSame(1649267187 as UnixTimestamp)).toBe(true)

  const int2 = TimeInterval.of(1649267185 as UnixTimestamp, 1649267187 as UnixTimestamp)

  expect(int1.isSame(int2)).toBe(true)
  expect(int1.cmp(int2)).toBe(0)
  expect(int1.isSameOrAfter(int2)).toBe(true)
  expect(int1.isSameOrBefore(int2)).toBe(true)
  expect(int1.isAfter(int2)).toBe(false)
  expect(int1.isBefore(int2)).toBe(false)

  expect(() => TimeInterval.parse('')).toThrowErrorMatchingInlineSnapshot(
    `[Error: Cannot parse "" into TimeInterval]`,
  )
  expect(() => TimeInterval.parse('abcd')).toThrowErrorMatchingInlineSnapshot(
    `[Error: Cannot parse "abcd" into TimeInterval]`,
  )
  expect(() => TimeInterval.parse('2022-02-24')).toThrowErrorMatchingInlineSnapshot(
    `[Error: Cannot parse "2022-02-24" into TimeInterval]`,
  )
  expect(() => TimeInterval.parse('2022-02-24/abcd')).toThrowErrorMatchingInlineSnapshot(
    `[Error: Cannot parse "2022-02-24/abcd" into TimeInterval]`,
  )
})
