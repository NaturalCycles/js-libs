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

/**
 * Return cached instance of Ajv with default (recommended) options.
 *
 * This function should be used as much as possible,
 * to benefit from cached Ajv instance.
 */
export const getAjv = _lazyValue(createAjv)

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
const TS_2000 = 946684800 // 2000-01-01

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
          return n >= 0 && n < TS_2500 * 1000
        },
      })
      .addFormat('unixTimestampMillis2000', {
        type: 'number',
        validate: (n: number) => {
          return n >= TS_2000 * 1000 && n < TS_2500 * 1000
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
  )
}
