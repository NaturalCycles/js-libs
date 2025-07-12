import { localTime } from '@naturalcycles/js-lib/datetime/localTime.js'
import type { IsoDate } from '@naturalcycles/js-lib/types'
import type Joi from 'joi'
import type { Extension, StringSchema as JoiStringSchema } from 'joi'

export interface StringSchema<TSchema = string> extends JoiStringSchema<TSchema> {
  dateString: (min?: IsoDate | 'today', max?: IsoDate | 'today') => StringSchema<IsoDate>
}

export interface JoiDateStringOptions {
  min?: IsoDate | 'today'
  max?: IsoDate | 'today'
}

export function stringExtensions(joi: typeof Joi): Extension {
  return {
    type: 'string',
    base: joi.string(),
    messages: {
      'string.dateString': '"{{#label}}" must be an ISO8601 date (yyyy-mm-dd)',
      'string.dateStringMin': '"{{#label}}" must be not earlier than {{#min}}',
      'string.dateStringMax': '"{{#label}}" must be not later than {{#max}}',
      'string.dateStringCalendarAccuracy': '"{{#label}}" must be a VALID calendar date',
      'string.stripHTML': '"{{#label}}" must NOT contain any HTML tags',
    },
    rules: {
      dateString: {
        method(min?: IsoDate, max?: IsoDate) {
          return this.$_addRule({
            name: 'dateString',
            args: { min, max } satisfies JoiDateStringOptions,
          })
        },
        args: [
          {
            name: 'min',
            // ref: true, // check false
            assert: v => v === undefined || typeof v === 'string',
            message: 'must be a string',
          },
          {
            name: 'max',
            // ref: true,
            assert: v => v === undefined || typeof v === 'string',
            message: 'must be a string',
          },
        ],
        validate(v: string, helpers, args: JoiDateStringOptions) {
          // console.log('dateString validate called', {v, args})

          let err: string | undefined
          let { min, max } = args

          // Today allows +-14 hours gap to account for different timezones
          if (max === 'today') {
            max = getTodayStrPlus15()
          }
          if (min === 'today') {
            min = getTodayStrMinus15()
          }
          // console.log('min/max', min, max)

          const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
          if (!parts || parts.length < 4) {
            err = 'string.dateString'
          } else if (min && v < min) {
            err = 'string.dateStringMin'
          } else if (max && v > max) {
            err = 'string.dateStringMax'
          } else if (!isValidDate(parts)) {
            err = 'string.dateStringCalendarAccuracy'
          }

          if (err) {
            return helpers.error(err, args)
          }

          return v // validation passed
        },
      },
    },
  }
}

const DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

// Based on: https://github.com/ajv-validator
function isValidDate(parts: string[]): boolean {
  const year = Number(parts[1])
  const month = Number(parts[2])
  const day = Number(parts[3])
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= (month === 2 && isLeapYear(year) ? 29 : DAYS[month]!)
  )
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

let lastCheckedPlus = 0
let todayStrPlusCached: IsoDate
let lastCheckedMinus = 0
let todayStrMinusCached: IsoDate

function getTodayStrPlus15(): IsoDate {
  const now = Date.now()
  if (now - lastCheckedPlus < 3_600_000) {
    // cached for 1 hour
    return todayStrPlusCached
  }

  lastCheckedPlus = now
  return (todayStrPlusCached = localTime.now().plus(15, 'hour').toISODate())
}

function getTodayStrMinus15(): IsoDate {
  const now = Date.now()
  if (now - lastCheckedMinus < 3_600_000) {
    // cached for 1 hour
    return todayStrMinusCached
  }

  lastCheckedMinus = now
  return (todayStrMinusCached = localTime.now().plus(-15, 'hour').toISODate())
}
