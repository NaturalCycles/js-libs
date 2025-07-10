import { localTime } from '@naturalcycles/js-lib/datetime'
import type { IsoDate } from '@naturalcycles/js-lib/types'
import { expectTypeOf, test } from 'vitest'
import { testValidation } from '../../test/validation.test.util.js'
import { stringSchema } from './joi.shared.schemas.js'
import { validate } from './joi.validation.util.js'
import type { StringSchema } from './string.extensions.js'

test('dateString', () => {
  const schema = stringSchema.dateString()

  testValidation(
    schema,
    ['2017-06-21', '2017-01-01', '1970-01-01'],
    ['a', '01-01-2017', '2017/05/05', '2017-5-5', '2017-05-5', '-2017-05-05'],
  )
})

test('dateString min/max', async () => {
  const schema = stringSchema.dateString('2017-06-21' as IsoDate, '2017-06-23' as IsoDate)

  expectTypeOf(schema).toEqualTypeOf<StringSchema<IsoDate>>()

  const value = validate('2017-06-22' as IsoDate, schema)
  expectTypeOf(value).toEqualTypeOf<IsoDate>()

  testValidation(
    schema,
    ['2017-06-21', '2017-06-22', '2017-06-23'],
    ['1971-01-01', '2017-06-19', '2017-06-20', '2017-06-24', '2017-06-25', '2018-01-01'],
  )
})

test('dateString min/max today', () => {
  const schema = stringSchema.dateString('today', 'today')

  // Today allows +-14 hours gap to account for different timezones
  // testing -1day or +1day is not reliable (cause it can either fit or not fit withing +-14 hours window, so non-deterministic)
  const today = localTime.now()
  const todayMinus10hours = today.minus(10, 'hour')
  const todayMinus2 = today.minus(2, 'day')
  const todayPlus10hours = today.plus(10, 'hour')
  const todayPlus2 = today.plus(2, 'day')

  testValidation(
    schema,
    [today.toISODate(), todayMinus10hours.toISODate(), todayPlus10hours.toISODate()],
    ['1971-01-01', '2450-06-19', todayMinus2.toISODate(), todayPlus2.toISODate()],
  )
})
