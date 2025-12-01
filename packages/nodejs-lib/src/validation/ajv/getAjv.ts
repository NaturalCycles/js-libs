import { _isBetween, _lazyValue } from '@naturalcycles/js-lib'
import { Set2 } from '@naturalcycles/js-lib/object'
import { _substringAfterLast } from '@naturalcycles/js-lib/string'
import type { AnyObject } from '@naturalcycles/js-lib/types'
import { Ajv2020, type Options, type ValidateFunction } from 'ajv/dist/2020.js'
import { validTLDs } from '../tlds.js'
import type {
  JsonSchemaIsoDateOptions,
  JsonSchemaIsoMonthOptions,
  JsonSchemaStringEmailOptions,
} from './jsonSchemaBuilder.js'

/* eslint-disable @typescript-eslint/prefer-string-starts-ends-with */
// oxlint-disable unicorn/prefer-code-point

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

const AJV_MUTATING_COERCING_OPTIONS: Options = {
  ...AJV_OPTIONS,
  coerceTypes: true,
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
 * Returns cached instance of Ajv, which is coercing data.
 *
 * To be used in places where we know that we are going to receive data with the wrong type,
 * typically: request path params and request query params.
 */
export const getCoercingAjv = _lazyValue(() => createAjv(AJV_MUTATING_COERCING_OPTIONS))

/**
 * Create Ajv with modified defaults.
 *
 * !!! Please note that this function is EXPENSIVE computationally !!!
 *
 * https://ajv.js.org/options.html
 */
export function createAjv(opt?: Options): Ajv2020 {
  const ajv = new Ajv2020({
    ...AJV_OPTIONS,
    ...opt,
  })

  // Adds $merge, $patch keywords
  // https://github.com/ajv-validator/ajv-merge-patch
  // Kirill: temporarily disabled, as it creates a noise of CVE warnings
  // require('ajv-merge-patch')(ajv)

  ajv.addKeyword({
    keyword: 'transform',
    type: 'string',
    modifying: true,
    schemaType: 'object',
    errors: true,
    validate: function validate(
      transform: { trim?: true; toLowerCase?: true; toUpperCase?: true; truncate?: number },
      data: string,
      _schema,
      ctx,
    ) {
      if (!data) return true

      let transformedData = data

      if (transform.trim) {
        transformedData = transformedData.trim()
      }

      if (transform.toLowerCase) {
        transformedData = transformedData.toLocaleLowerCase()
      }

      if (transform.toUpperCase) {
        transformedData = transformedData.toLocaleUpperCase()
      }

      if (typeof transform.truncate === 'number' && transform.truncate >= 0) {
        transformedData = transformedData.slice(0, transform.truncate)

        if (transform.trim) {
          transformedData = transformedData.trim()
        }
      }

      // Explicit check for `undefined` because parentDataProperty can be `0` when it comes to arrays.
      if (ctx?.parentData && typeof ctx.parentDataProperty !== 'undefined') {
        ctx.parentData[ctx.parentDataProperty] = transformedData
      }

      return true
    },
  })

  ajv.addKeyword({
    keyword: 'instanceof',
    modifying: false,
    schemaType: 'string',
    validate(instanceOf: string, data: unknown, _schema, _ctx) {
      if (typeof data !== 'object') return false
      if (data === null) return false

      let proto = Object.getPrototypeOf(data)
      while (proto) {
        if (proto.constructor?.name === instanceOf) return true
        proto = Object.getPrototypeOf(proto)
      }

      return false
    },
  })

  ajv.addKeyword({
    keyword: 'Set2',
    type: ['array', 'object'],
    modifying: true,
    errors: true,
    schemaType: 'object',
    compile(innerSchema, _parentSchema, _it) {
      const validateItem: ValidateFunction = ajv.compile(innerSchema)

      function validateSet(data: any, ctx: any): boolean {
        let set: Set2

        const isIterable = data === null || typeof data[Symbol.iterator] === 'function'

        if (data instanceof Set2) {
          set = data
        } else if (isIterable && ctx?.parentData) {
          set = new Set2(data)
        } else if (isIterable && !ctx?.parentData) {
          ;(validateSet as any).errors = [
            {
              instancePath: ctx?.instancePath ?? '',
              message:
                'can only transform an Iterable into a Set2 when the schema is in an object or an array schema. This is an Ajv limitation.',
            },
          ]
          return false
        } else {
          ;(validateSet as any).errors = [
            {
              instancePath: ctx?.instancePath ?? '',
              message: 'must be a Set2 object (or optionally an Iterable in some cases)',
            },
          ]
          return false
        }

        let idx = 0
        for (const value of set.values()) {
          if (!validateItem(value)) {
            ;(validateSet as any).errors = [
              {
                instancePath: (ctx?.instancePath ?? '') + '/' + idx,
                message: `invalid set item at index ${idx}`,
                params: { errors: validateItem.errors },
              },
            ]
            return false
          }
          idx++
        }

        if (ctx?.parentData && ctx.parentDataProperty) {
          ctx.parentData[ctx.parentDataProperty] = set
        }

        return true
      }

      return validateSet
    },
  })

  ajv.addKeyword({
    keyword: 'Buffer',
    modifying: true,
    errors: true,
    schemaType: 'boolean',
    compile(_innerSchema, _parentSchema, _it) {
      function validateBuffer(data: any, ctx: any): boolean {
        let buffer: Buffer

        if (data === null) return false

        const isValid =
          data instanceof Buffer ||
          data instanceof ArrayBuffer ||
          Array.isArray(data) ||
          typeof data === 'string'
        if (!isValid) return false

        if (data instanceof Buffer) {
          buffer = data
        } else if (isValid && ctx?.parentData) {
          buffer = Buffer.from(data as any)
        } else if (isValid && !ctx?.parentData) {
          ;(validateBuffer as any).errors = [
            {
              instancePath: ctx?.instancePath ?? '',
              message:
                'can only transform data into a Buffer when the schema is in an object or an array schema. This is an Ajv limitation.',
            },
          ]
          return false
        } else {
          ;(validateBuffer as any).errors = [
            {
              instancePath: ctx?.instancePath ?? '',
              message:
                'must be a Buffer object (or optionally an Array-like object or ArrayBuffer in some cases)',
            },
          ]
          return false
        }

        if (ctx?.parentData && ctx.parentDataProperty) {
          ctx.parentData[ctx.parentDataProperty] = buffer
        }

        return true
      }

      return validateBuffer
    },
  })

  ajv.addKeyword({
    keyword: 'email',
    type: 'string',
    modifying: true,
    errors: true,
    schemaType: 'object',
    validate: function validate(opt: JsonSchemaStringEmailOptions, data: string, _schema, ctx) {
      const { checkTLD } = opt
      const cleanData = data.trim()

      // from `ajv-formats`
      const EMAIL_REGEX =
        /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i
      const result = cleanData.match(EMAIL_REGEX)

      if (!result) {
        ;(validate as any).errors = [
          {
            instancePath: ctx?.instancePath ?? '',
            message: `is not a valid email address`,
          },
        ]
        return false
      }

      if (checkTLD) {
        const tld = _substringAfterLast(cleanData, '.')
        if (!validTLDs.has(tld)) {
          ;(validate as any).errors = [
            {
              instancePath: ctx?.instancePath ?? '',
              message: `has an invalid TLD`,
            },
          ]
          return false
        }
      }

      if (ctx?.parentData && ctx.parentDataProperty) {
        ctx.parentData[ctx.parentDataProperty] = cleanData
      }

      return true
    },
  })

  ajv.addKeyword({
    keyword: 'IsoDate',
    type: 'string',
    modifying: false,
    errors: true,
    schemaType: 'object',
    validate: function validate(opt: JsonSchemaIsoDateOptions, data: string, _schema, ctx) {
      const hasOptions = Object.keys(opt).length > 0

      const isValid = isIsoDateValid(data)
      if (!isValid) {
        ;(validate as any).errors = [
          {
            instancePath: ctx?.instancePath ?? '',
            message: `is an invalid IsoDate`,
          },
        ]

        return false
      }

      if (!hasOptions) return true

      const { before, sameOrBefore, after, sameOrAfter } = opt
      const errors: any[] = []

      if (before) {
        const isParamValid = isIsoDateValid(before)
        const isRuleValid = isParamValid && before > data

        if (!isRuleValid) {
          errors.push({
            instancePath: ctx?.instancePath ?? '',
            message: `is not before ${before}`,
          })
        }
      }

      if (sameOrBefore) {
        const isParamValid = isIsoDateValid(sameOrBefore)
        const isRuleValid = isParamValid && sameOrBefore >= data

        if (!isRuleValid) {
          errors.push({
            instancePath: ctx?.instancePath ?? '',
            message: `is not the same or before ${sameOrBefore}`,
          })
        }
      }

      if (after) {
        const isParamValid = isIsoDateValid(after)
        const isRuleValid = isParamValid && after < data

        if (!isRuleValid) {
          errors.push({
            instancePath: ctx?.instancePath ?? '',
            message: `is not after ${after}`,
          })
        }
      }

      if (sameOrAfter) {
        const isParamValid = isIsoDateValid(sameOrAfter)
        const isRuleValid = isParamValid && sameOrAfter <= data

        if (!isRuleValid) {
          errors.push({
            instancePath: ctx?.instancePath ?? '',
            message: `is not the same or after ${sameOrAfter}`,
          })
        }
      }

      if (errors.length === 0) return true
      ;(validate as any).errors = errors
      return false
    },
  })

  ajv.addKeyword({
    keyword: 'IsoDateTime',
    type: 'string',
    modifying: false,
    errors: true,
    schemaType: 'boolean',
    validate: function validate(_opt: JsonSchemaIsoMonthOptions, data: string, _schema, ctx) {
      const isValid = isIsoDateTimeValid(data)
      if (isValid) return true
      ;(validate as any).errors = [
        {
          instancePath: ctx?.instancePath ?? '',
          message: `is an invalid IsoDateTime`,
        },
      ]
      return false
    },
  })

  ajv.addKeyword({
    keyword: 'IsoMonth',
    type: 'string',
    modifying: false,
    errors: true,
    schemaType: 'object',
    validate: function validate(_opt: true, data: string, _schema, ctx) {
      const isValid = isIsoMonthValid(data)
      if (isValid) return true
      ;(validate as any).errors = [
        {
          instancePath: ctx?.instancePath ?? '',
          message: `is an invalid IsoMonth`,
        },
      ]
      return false
    },
  })

  ajv.addKeyword({
    keyword: 'errorMessages',
    schemaType: 'object',
  })

  ajv.addKeyword({
    keyword: 'hasIsOfTypeCheck',
    schemaType: 'boolean',
  })

  ajv.addKeyword({
    keyword: 'optionalValues',
    type: ['string', 'number', 'boolean'],
    modifying: true,
    errors: false,
    schemaType: 'array',
    validate: function validate(
      optionalValues: (string | number | boolean)[],
      data: string | number | boolean,
      _schema,
      ctx,
    ) {
      if (!optionalValues) return true

      if (!optionalValues.includes(data)) return true

      if (ctx?.parentData && ctx.parentDataProperty) {
        delete ctx.parentData[ctx.parentDataProperty]
      }

      return true
    },
  })

  ajv.addKeyword({
    keyword: 'keySchema',
    type: 'object',
    modifying: true,
    errors: false,
    schemaType: 'object',
    compile(innerSchema, _parentSchema, _it) {
      const isValidKeyFn: ValidateFunction = ajv.compile(innerSchema)

      function validate(data: AnyObject, _ctx: any): boolean {
        if (typeof data !== 'object' || data === null) return true

        for (const key of Object.keys(data)) {
          if (!isValidKeyFn(key)) {
            delete data[key]
          }
        }

        return true
      }

      return validate
    },
  })

  // This and `maxProperties2` are added because Ajv validates the `min/maxProperties` before validating the properties.
  // So, in case of `minProperties(1)` and `{ foo: 'bar' }` Ajv will let it pass, even
  // if the property validation would strip `foo` from the data.
  // And Ajv would return `{}` as a successful validation.
  // Since the keyword validation runs after JSON Schema validation,
  // here we can make sure the number of properties are right ex-post property validation.
  // It's named with the `2` suffix, because `minProperties` is reserved.
  // And `maxProperties` does not suffer from this error due to the nature of how maximum works.
  ajv.addKeyword({
    keyword: 'minProperties2',
    type: 'object',
    modifying: false,
    errors: true,
    schemaType: 'number',
    validate: function validate(minProperties: number, data: AnyObject, _schema, ctx) {
      if (typeof data !== 'object') return true

      const numberOfProperties = Object.getOwnPropertyNames(data).length
      const isValid = numberOfProperties >= minProperties
      if (!isValid) {
        ;(validate as any).errors = [
          {
            instancePath: ctx?.instancePath ?? '',
            message: `must NOT have fewer than ${minProperties} properties`,
          },
        ]
      }

      return isValid
    },
  })

  return ajv
}

const monthLengths = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

const DASH_CODE = '-'.charCodeAt(0)
const ZERO_CODE = '0'.charCodeAt(0)
const PLUS_CODE = '+'.charCodeAt(0)
const COLON_CODE = ':'.charCodeAt(0)

/**
 * This is a performance optimized correct validation
 * for ISO dates formatted as YYYY-MM-DD.
 *
 * - Slightly more performant than using `localDate`.
 * - More performant than string splitting and `Number()` conversions
 * - Less performant than regex, but it does not allow invalid dates.
 */
function isIsoDateValid(s: string): boolean {
  // must be exactly "YYYY-MM-DD"
  if (s.length !== 10) return false
  if (s.charCodeAt(4) !== DASH_CODE || s.charCodeAt(7) !== DASH_CODE) return false

  // fast parse numbers without substrings/Number()
  const year =
    (s.charCodeAt(0) - ZERO_CODE) * 1000 +
    (s.charCodeAt(1) - ZERO_CODE) * 100 +
    (s.charCodeAt(2) - ZERO_CODE) * 10 +
    (s.charCodeAt(3) - ZERO_CODE)

  const month = (s.charCodeAt(5) - ZERO_CODE) * 10 + (s.charCodeAt(6) - ZERO_CODE)
  const day = (s.charCodeAt(8) - ZERO_CODE) * 10 + (s.charCodeAt(9) - ZERO_CODE)

  if (month < 1 || month > 12 || day < 1) return false

  if (month !== 2) {
    return day <= monthLengths[month]!
  }

  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  return day <= (isLeap ? 29 : 28)
}

/**
 * This is a performance optimized correct validation
 * for ISO datetimes formatted as "YYYY-MM-DDTHH:MM:SS" followed by
 * nothing, "Z" or "+hh:mm" or "-hh:mm".
 *
 * - Slightly more performant than using `localTime`.
 * - More performant than string splitting and `Number()` conversions
 * - Less performant than regex, but it does not allow invalid dates.
 */
function isIsoDateTimeValid(s: string): boolean {
  if (s.length < 19 || s.length > 25) return false
  if (s.charCodeAt(10) !== 84) return false // 'T'

  const datePart = s.slice(0, 10) // YYYY-MM-DD
  if (!isIsoDateValid(datePart)) return false

  const timePart = s.slice(11, 19) // HH:MM:SS
  if (!isIsoTimeValid(timePart)) return false

  const zonePart = s.slice(19) // nothing or Z or +/-hh:mm
  if (!isIsoTimezoneValid(zonePart)) return false

  return true
}

/**
 * This is a performance optimized correct validation
 * for ISO times formatted as "HH:MM:SS".
 *
 * - Slightly more performant than using `localTime`.
 * - More performant than string splitting and `Number()` conversions
 * - Less performant than regex, but it does not allow invalid dates.
 */
function isIsoTimeValid(s: string): boolean {
  if (s.length !== 8) return false
  if (s.charCodeAt(2) !== COLON_CODE || s.charCodeAt(5) !== COLON_CODE) return false

  const hour = (s.charCodeAt(0) - ZERO_CODE) * 10 + (s.charCodeAt(1) - ZERO_CODE)
  if (hour < 0 || hour > 23) return false

  const minute = (s.charCodeAt(3) - ZERO_CODE) * 10 + (s.charCodeAt(4) - ZERO_CODE)
  if (minute < 0 || minute > 59) return false

  const second = (s.charCodeAt(6) - ZERO_CODE) * 10 + (s.charCodeAt(7) - ZERO_CODE)
  if (second < 0 || second > 59) return false

  return true
}

/**
 * This is a performance optimized correct validation
 * for the timezone suffix of ISO times
 * formatted as "Z" or "+HH:MM" or "-HH:MM".
 *
 * It also accepts an empty string.
 */
function isIsoTimezoneValid(s: string): boolean {
  if (s === '') return true
  if (s === 'Z') return true
  if (s.length !== 6) return false
  if (s.charCodeAt(0) !== PLUS_CODE && s.charCodeAt(0) !== DASH_CODE) return false
  if (s.charCodeAt(3) !== COLON_CODE) return false

  const isWestern = s[0] === '-'
  const isEastern = s[0] === '+'

  const hour = (s.charCodeAt(1) - ZERO_CODE) * 10 + (s.charCodeAt(2) - ZERO_CODE)
  if (hour < 0) return false
  if (isWestern && hour > 12) return false
  if (isEastern && hour > 14) return false

  const minute = (s.charCodeAt(4) - ZERO_CODE) * 10 + (s.charCodeAt(5) - ZERO_CODE)
  if (minute < 0 || minute > 59) return false

  if (isEastern && hour === 14 && minute > 0) return false // max is +14:00
  if (isWestern && hour === 12 && minute > 0) return false // min is -12:00

  return true
}

/**
 * This is a performance optimized correct validation
 * for ISO month formatted as "YYYY-MM".
 */
function isIsoMonthValid(s: string): boolean {
  // must be exactly "YYYY-MM"
  if (s.length !== 7) return false
  if (s.charCodeAt(4) !== DASH_CODE) return false

  // fast parse numbers without substrings/Number()
  const year =
    (s.charCodeAt(0) - ZERO_CODE) * 1000 +
    (s.charCodeAt(1) - ZERO_CODE) * 100 +
    (s.charCodeAt(2) - ZERO_CODE) * 10 +
    (s.charCodeAt(3) - ZERO_CODE)

  const month = (s.charCodeAt(5) - ZERO_CODE) * 10 + (s.charCodeAt(6) - ZERO_CODE)

  return _isBetween(year, 1900, 2500, '[]') && _isBetween(month, 1, 12, '[]')
}
