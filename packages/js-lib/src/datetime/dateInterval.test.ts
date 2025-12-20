import { expect, test } from 'vitest'
import type { IsoDate } from '../types.js'
import { DateInterval } from './dateInterval.js'
import { localDate } from './localDate.js'

test('basic', () => {
  const str1 = '2022-02-24/2022-03-30'
  const int1 = DateInterval.parse(str1)
  expect(int1.toString()).toBe(str1)
  expect(JSON.stringify(int1)).toBe(`"${str1}"`)
  expect(int1.start.isSame('2022-02-24' as IsoDate)).toBe(true)
  expect(int1.end.isSame('2022-03-30' as IsoDate)).toBe(true)

  const int2 = DateInterval.of('2022-02-24' as IsoDate, '2022-03-30' as IsoDate)
  const int3 = DateInterval.of(
    localDate('2022-02-24' as IsoDate),
    localDate('2022-03-30' as IsoDate),
  )

  expect(int1.isSame(int2)).toBe(true)
  expect(int1.cmp(int2)).toBe(0)
  expect(int1.isSameOrAfter(int2)).toBe(true)
  expect(int1.isSameOrBefore(int2)).toBe(true)
  expect(int1.isAfter(int2)).toBe(false)
  expect(int1.isBefore(int2)).toBe(false)
  expect(int1.isSame(int3)).toBe(true)

  expect(() => DateInterval.parse('')).toThrowErrorMatchingInlineSnapshot(
    `[Error: Cannot parse "" into DateInterval]`,
  )
  expect(() => DateInterval.parse('abcd')).toThrowErrorMatchingInlineSnapshot(
    `[Error: Cannot parse "abcd" into DateInterval]`,
  )
  expect(() => DateInterval.parse('2022-02-24')).toThrowErrorMatchingInlineSnapshot(
    `[Error: Cannot parse "2022-02-24" into DateInterval]`,
  )
  expect(() => DateInterval.parse('2022-02-24/abcd')).toThrowErrorMatchingInlineSnapshot(
    `[AssertionError: Cannot parse "abcd" into LocalDate]`,
  )
})

test('includes', () => {
  const int = DateInterval.parse('2022-02-24/2022-03-30')
  expect(int.includes('2022-02-23' as IsoDate)).toBe(false)
  expect(int.includes('2022-02-24' as IsoDate)).toBe(true)
  expect(int.includes('2022-02-25' as IsoDate)).toBe(true)
  expect(int.includes('2022-02-28' as IsoDate)).toBe(true)
  expect(int.includes('2022-03-01' as IsoDate)).toBe(true)
  expect(int.includes('2022-03-11' as IsoDate)).toBe(true)
  expect(int.includes('2022-03-29' as IsoDate)).toBe(true)
  expect(int.includes('2022-03-30' as IsoDate)).toBe(true)
  expect(int.includes('2022-03-31' as IsoDate)).toBe(false)
  expect(int.includes('2022-04-01' as IsoDate)).toBe(false)
})

test('getDays', () => {
  const int = DateInterval.parse('2022-02-24/2022-03-01')
  expect(int.getDays()).toMatchInlineSnapshot(`
    [
      "2022-02-24",
      "2022-02-25",
      "2022-02-26",
      "2022-02-27",
      "2022-02-28",
      "2022-03-01",
    ]
  `)
})

test('intersects', () => {
  const int = DateInterval.parse('2022-03-01/2022-03-31')
  expect(int.intersects('2022-03-01/2022-03-31')).toBe(true)
  expect(int.intersects('2022-03-02/2022-03-31')).toBe(true)
  expect(int.intersects('2022-03-02/2022-03-30')).toBe(true)
  expect(int.intersects('2022-03-02/2022-04-30')).toBe(true)
  expect(int.intersects('2022-03-02/2022-03-02')).toBe(true)
  expect(int.intersects('2022-02-02/2022-03-01')).toBe(true)
  expect(int.intersects('2022-02-02/2022-02-03')).toBe(false)
  expect(int.intersects('2022-02-02/2022-02-28')).toBe(false)
  expect(int.intersects('2022-04-01/2022-04-02')).toBe(false)
})
