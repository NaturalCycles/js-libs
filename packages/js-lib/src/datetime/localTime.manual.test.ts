/*

yarn dev-lib test-manual localTime

This file is for extensive (slow) equivalence testing between localTime and dayjs.
It's slow, therefor it's made manual.

 */

import dayjs from 'dayjs'
import enGB from 'dayjs/locale/en-gb.js'
import { test } from 'vitest'
import { _range } from '../array/range.js'
import { expectWithMessage, isUTC } from '../test/test.util.js'
import type { IsoDateTime } from '../types.js'
import type { LocalTimeUnit } from './localTime.js'
import { localTime } from './localTime.js'

// Set en-gb by default, to have e.g Monday as fdow
// This "loads" the locale:
dayjs.locale(enGB, {}, true)
// This sets en-gb as default:
dayjs.locale('en-gb')

const units: LocalTimeUnit[] = ['year', 'month', 'day', 'hour', 'minute', 'second', 'week']

const UNIT_RANGE: Record<LocalTimeUnit, number> = {
  year: 1000,
  month: 100,
  week: 1000,
  day: 5000,
  hour: 10000,
  minute: 10000,
  second: 10000,
}

const DAYJS_ISO_DATE = 'YYYY-MM-DD'

test('add', () => {
  if (!isUTC()) return
  const starts = [
    '2022-05-31',
    '2022-05-30',
    '2020-02-29',
    '2021-02-28',
    '2022-01-01',
  ] as IsoDateTime[]

  starts.forEach(start => {
    const lt = localTime(start)
    const d = dayjs(start)

    units.forEach(unit => {
      _range(UNIT_RANGE[unit]).forEach(i => {
        let expected = d.add(i, unit)
        let actual = lt.plus(i, unit)

        expectWithMessage(`${lt} + ${i} ${unit}`, expected.unix(), actual.unix, expected, actual)
        expectWithMessage(
          `${lt} + ${i} ${unit}`,
          expected.unix() * 1000,
          actual.unixMillis,
          expected,
          actual,
        )
        expectWithMessage(
          `${lt} + ${i} ${unit}`,
          expected.format(DAYJS_ISO_DATE), // was: toIsoDate
          actual.toISODate(),
          expected,
          actual,
        )
        expectWithMessage(
          `${lt} + ${i} ${unit}`,
          expected.format(),
          actual.toISODateTime() + '+00:00',
          expected,
          actual,
        )

        expected = d.subtract(i, unit)
        actual = lt.minus(i, unit)
        expectWithMessage(`${lt} - ${i} ${unit}`, expected.unix(), actual.unix, expected, actual)

        units.forEach(roundUnit => {
          // console.log(unit2, lt.add(i, unit).startOf(unit2).toPretty(), d.add(i, unit).startOf(unit2).toPretty())
          // expect(lt.add(i, unit).startOf(unit2).unix()).toBe(d.add(i, unit).startOf(unit2).unix())
          expected = d.add(i, unit).startOf(roundUnit)
          actual = lt.plus(i, unit).startOf(roundUnit)

          expectWithMessage(
            `${lt} + ${i} ${unit} startOf(${roundUnit})`,
            expected.unix(),
            actual.unix,
            expected,
            actual,
          )

          expected = d.add(i, unit).endOf(roundUnit)
          actual = lt.plus(i, unit).endOf(roundUnit)

          expectWithMessage(
            `${lt} + ${i} ${unit} endOf(${roundUnit})`,
            expected.unix(),
            actual.unix,
            expected,
            actual,
          )

          expected = d.add(i, unit).add(40, 'day').startOf(roundUnit)
          actual = lt.plus(i, unit).plus(40, 'day').startOf(roundUnit)

          expectWithMessage(
            `${lt} + ${i} ${unit} + 40 days startOf(${roundUnit})`,
            expected.unix(),
            actual.unix,
            expected,
            actual,
          )
        })
      })
    })
  })
})

test('diff', () => {
  if (!isUTC()) return
  const starts = [
    '2022-05-31',
    '2022-05-30',
    '2020-02-29',
    '2021-02-28',
    '2022-01-01',
  ] as IsoDateTime[]
  // const starts = ['2020-02-29']

  starts.forEach(start => {
    const lt = localTime(start)
    const d = dayjs(start)

    units.forEach(unit => {
      units.forEach(unitAdd => {
        _range(UNIT_RANGE[unitAdd]).forEach(i => {
          let left = lt.plus(i, unitAdd)
          let right = lt
          let actual = left.diff(right, unit)
          let expected = d.add(i, unitAdd).diff(d, unit)

          expectWithMessage(`${left} diff ${right} in ${unit}`, expected, actual)

          actual = right.diff(left, unit)
          expected = d.diff(d.add(i, unitAdd), unit)

          expectWithMessage(`${right} diff ${left} in ${unit}`, expected, actual)

          left = lt
          right = lt.plus(-i, unitAdd)
          actual = left.diff(right, unit)
          expected = d.diff(d.add(-i, unitAdd), unit)
          expectWithMessage(`${left} diff ${right} in ${unit}`, expected, actual)
        })
      })
    })
  })
})
