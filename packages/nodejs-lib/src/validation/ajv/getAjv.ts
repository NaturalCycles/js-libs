/* eslint-disable @typescript-eslint/prefer-string-starts-ends-with */
/* eslint-disable unicorn/prefer-code-point */
import { _lazyValue } from '@naturalcycles/js-lib'
import type { Options } from 'ajv'
import { Ajv } from 'ajv'
import ajvFormats from 'ajv-formats'
import ajvKeywords from 'ajv-keywords'

const AJV_OPTIONS: Options = {
  removeAdditional: true,
  allErrors: true,
  // https://ajv.js.org/options.html#usedefaults
  useDefaults: 'empty', // this will mutate your input!
  // these are important and kept same as default:
  // https://ajv.js.org/options.html#coercetypes
  coerceTypes: false, // while `false` - it won't mutate your input
}

const AJV_NON_MUTATING_OPTIONS: Options = {
  ...AJV_OPTIONS,
  removeAdditional: false,
  useDefaults: false,
}

/**
 * Return cached instance of Ajv with default (recommended) options.
 *
 * This function should be used as much as possible,
 * to benefit from cached Ajv instance.
 */
export const getAjv = _lazyValue(createAjv)

/**
 * Returns cached instance of Ajv, which is non-mutating.
 *
 * To be used in places where we only need to know if an item is valid or not,
 * and are not interested in transforming the data.
 */
export const getNonMutatingAjv = _lazyValue(() => createAjv(AJV_NON_MUTATING_OPTIONS))

/**
 * Create Ajv with modified defaults.
 *
 * !!! Please note that this function is EXPENSIVE computationally !!!
 *
 * https://ajv.js.org/options.html
 */
export function createAjv(opt?: Options): Ajv {
  const ajv = new Ajv({
    ...AJV_OPTIONS,
    ...opt,
  })

  // Add custom formats
  addCustomAjvFormats(ajv)

  // todo: review and possibly cherry-pick/vendor the formats
  // Adds ajv "formats"
  // https://ajv.js.org/guide/formats.html
  // @ts-expect-error types are wrong
  ajvFormats(ajv)

  // https://ajv.js.org/packages/ajv-keywords.html
  // @ts-expect-error types are wrong
  ajvKeywords(ajv, [
    'transform', // trim, toLowerCase, etc.
    'uniqueItemProperties',
    'instanceof',
  ])

  // Adds $merge, $patch keywords
  // https://github.com/ajv-validator/ajv-merge-patch
  // Kirill: temporarily disabled, as it creates a noise of CVE warnings
  // require('ajv-merge-patch')(ajv)

  return ajv
}

const TS_2500 = 16725225600 // 2500-01-01
const TS_2500_MILLIS = TS_2500 * 1000
const TS_2000 = 946684800 // 2000-01-01
const TS_2000_MILLIS = TS_2000 * 1000

const monthLengths = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

function addCustomAjvFormats(ajv: Ajv): Ajv {
  return (
    ajv
      .addFormat('id', /^[a-z0-9_]{6,64}$/)
      .addFormat('slug', /^[a-z0-9-]+$/)
      .addFormat('semVer', /^[0-9]+\.[0-9]+\.[0-9]+$/)
      // IETF language tag (https://en.wikipedia.org/wiki/IETF_language_tag)
      .addFormat('languageTag', /^[a-z]{2}(-[A-Z]{2})?$/)
      .addFormat('countryCode', /^[A-Z]{2}$/)
      .addFormat('currency', /^[A-Z]{3}$/)
      .addFormat('unixTimestamp', {
        type: 'number',
        validate: (n: number) => {
          return n >= 0 && n < TS_2500
        },
      })
      .addFormat('unixTimestamp2000', {
        type: 'number',
        validate: (n: number) => {
          return n >= TS_2000 && n < TS_2500
        },
      })
      .addFormat('unixTimestampMillis', {
        type: 'number',
        validate: (n: number) => {
          return n >= 0 && n < TS_2500_MILLIS
        },
      })
      .addFormat('unixTimestampMillis2000', {
        type: 'number',
        validate: (n: number) => {
          return n >= TS_2000_MILLIS && n < TS_2500_MILLIS
        },
      })
      .addFormat('utcOffset', {
        type: 'number',
        validate: (n: number) => {
          // min: -14 hours
          // max +14 hours
          // multipleOf 15 (minutes)
          return n >= -14 * 60 && n <= 14 * 60 && Number.isInteger(n)
        },
      })
      .addFormat('utcOffsetHours', {
        type: 'number',
        validate: (n: number) => {
          // min: -14 hours
          // max +14 hours
          // multipleOf 15 (minutes)
          return n >= -14 && n <= 14 && Number.isInteger(n)
        },
      })
      .addFormat('isoDate', {
        type: 'string',
        validate: isoDate,
      })
      .addFormat('isoDateTime', {
        type: 'string',
        validate: isoDateTime,
      })
  )
}

function isoDate(s: string): boolean {
  // must be exactly "YYYY-MM-DD"
  if (s.length !== 10) return false
  if (s.charCodeAt(4) !== 45 || s.charCodeAt(7) !== 45) return false // '-'

  // fast parse numbers without substrings/Number()
  const year =
    (s.charCodeAt(0) - 48) * 1000 +
    (s.charCodeAt(1) - 48) * 100 +
    (s.charCodeAt(2) - 48) * 10 +
    (s.charCodeAt(3) - 48)

  const month = (s.charCodeAt(5) - 48) * 10 + (s.charCodeAt(6) - 48)
  const day = (s.charCodeAt(8) - 48) * 10 + (s.charCodeAt(9) - 48)

  if (month < 1 || month > 12 || day < 1) return false

  if (month !== 2) {
    return day <= monthLengths[month]!
  }

  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  return day <= (isLeap ? 29 : 28)
}

export function isoDateTime(s: string): boolean {
  // "YYYY-MM-DDTHH:MM:SS" followed by
  // optional ".mmm" and
  // nothing, "Z" or "+hh:mm" or "-hh:mm"
  if (s.length < 19 || s.length > 29) return false
  if (s.charCodeAt(10) !== 84) return false // 'T'

  const hasMsPart = s.charCodeAt(19) === 46 // '.'

  const datePart = s.slice(0, 10) // YYYY-MM-DD
  if (!isoDate(datePart)) return false

  const timePart = hasMsPart ? s.slice(11, 23) : s.slice(11, 19) // HH:MM:SS.mmm
  if (!isoTime(timePart)) return false

  const zonePart = hasMsPart ? s.slice(23) : s.slice(19) // nothing or Z or +/-hh:mm
  if (!isoTimezone(zonePart)) return false

  return true
}

function isoTime(s: string): boolean {
  // "HH:MM:SS"
  // optional ".mmm"
  const hasMsPart = s.charCodeAt(8) === 46 // '.'
  const hasProperLength = (hasMsPart && s.length === 12) || (!hasMsPart && s.length === 8)
  if (!hasProperLength) return false
  if (s.charCodeAt(2) !== 58 || s.charCodeAt(5) !== 58) return false // ':'

  const hour = (s.charCodeAt(0) - 48) * 10 + (s.charCodeAt(1) - 48)
  if (hour < 0 || hour > 23) return false

  const minute = (s.charCodeAt(3) - 48) * 10 + (s.charCodeAt(4) - 48)
  if (minute < 0 || minute > 59) return false

  const second = (s.charCodeAt(6) - 48) * 10 + (s.charCodeAt(7) - 48)
  if (second < 0 || second > 59) return false

  const ms = hasMsPart
    ? (s.charCodeAt(9) - 48) * 100 + (s.charCodeAt(10) - 48) * 10 + (s.charCodeAt(11) - 48)
    : 0
  if (ms < 0 || ms > 999) return false

  return true
}

function isoTimezone(s: string): boolean {
  // "Z" or "+hh:mm" or "-hh:mm"
  if (s === '') return true
  if (s === 'Z') return true
  if (s.length !== 6) return false
  if (s.charCodeAt(0) !== 43 && s.charCodeAt(0) !== 45) return false // + or -
  if (s.charCodeAt(3) !== 58) return false // :

  const isWestern = s[0] === '-'
  const isEastern = s[0] === '+'

  const hour = (s.charCodeAt(1) - 48) * 10 + (s.charCodeAt(2) - 48)
  if (hour < 0) return false
  if (isWestern && hour > 12) return false
  if (isEastern && hour > 14) return false

  const minute = (s.charCodeAt(4) - 48) * 10 + (s.charCodeAt(5) - 48)
  if (minute < 0 || minute > 59) return false

  if (isEastern && hour === 14 && minute > 0) return false // max is +14:00
  if (isWestern && hour === 12 && minute > 0) return false // min is -12:00

  return true
}
