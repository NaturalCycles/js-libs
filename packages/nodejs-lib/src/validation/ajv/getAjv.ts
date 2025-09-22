import { _lazyValue } from '@naturalcycles/js-lib'
import { localDate as localDateImport } from '@naturalcycles/js-lib/datetime'
import { _typeCast } from '@naturalcycles/js-lib/types'
import type { CustomZodIsoDateParams } from '@naturalcycles/js-lib/zod'
import type { KeywordCxt, Options } from 'ajv'
import { _, Ajv, str } from 'ajv'
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

  addIsoDateKeyword(ajv)

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
  )
}

export function addIsoDateKeyword(ajv: Ajv): void {
  ajv.addKeyword({
    keyword: 'isoDate',
    type: 'string',
    schemaType: 'object',

    metaSchema: {
      type: 'object',
      additionalProperties: false,
      minProperties: 0,
      maxProperties: 1,
      properties: {
        before: { type: 'string' },
        sameOrBefore: { type: 'string' },
        after: { type: 'string' },
        sameOrAfter: { type: 'string' },
        between: {
          type: 'object',
          required: ['min', 'max', 'incl'],
          additionalProperties: false,
          properties: {
            min: { type: 'string' },
            max: { type: 'string' },
            incl: { enum: ['[]', '[)'] },
          },
        },
      },
    },

    error: {
      message: ({ schema }) => {
        if (schema.after) return str`should be after ${schema.after}`
        if (schema.sameOrAfter) return str`should be on or after ${schema.sameOrAfter}`
        if (schema.before) return str`should be before ${schema.before}`
        if (schema.sameOrBefore) return str`should be on or before ${schema.sameOrBefore}`
        if (schema.between) {
          const { min, max, incl } = schema.between
          return str`should be between ${min} and ${max} (incl: ${incl})`
        }
        return str`should be a YYYY-MM-DD string`
      },
    },

    code(cxt: KeywordCxt) {
      const { gen, data, schema } = cxt
      _typeCast<CustomZodIsoDateParams>(schema)

      // Put the helper in Ajv's external "keyword" scope. The `key` isolates the entry.
      const localDate = gen.scopeValue('keyword', {
        key: str`nc:localDate`,
        ref: localDateImport, // use the already-imported value when not generating standalone
        code: _`require("@naturalcycles/js-lib/datetime").localDate`, // used for standalone code
      })

      gen.if(_`!${localDate}.isValidString(${data})`, () => {
        cxt.fail(_`true`)
      })

      const d = gen.const('d', _`${localDate}.fromString(${data})`)

      if (schema.after) {
        cxt.fail(_`!${d}.isAfter(${schema.after})`)
        return
      }

      if (schema.sameOrAfter) {
        cxt.fail(_`!${d}.isSameOrAfter(${schema.sameOrAfter})`)
        return
      }

      if (schema.before) {
        cxt.fail(_`!${d}.isBefore(${schema.before})`)
        return
      }

      if (schema.sameOrBefore) {
        cxt.fail(_`!${d}.isSameOrBefore(${schema.sameOrBefore})`)
        return
      }

      if (schema.between) {
        const { min, max, incl } = schema.between
        cxt.fail(_`!${d}.isBetween(${min}, ${max}, ${incl})`)
        return
      }
    },
  })
}
