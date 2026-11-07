import { _isBetween, _lazyValue, _round } from '@naturalcycles/js-lib'
import { _assert } from '@naturalcycles/js-lib/error'
import { _deepCopy, _mapObject, Set2 } from '@naturalcycles/js-lib/object'
import { _substringAfterLast } from '@naturalcycles/js-lib/string'
import type { AnyObject } from '@naturalcycles/js-lib/types'
import type { Code, KeywordCxt, Options, ValidateFunction } from 'ajv/dist/2020.js'
import { _, Ajv2020, str } from 'ajv/dist/2020.js'
import { validTLDs } from '../tlds.js'
import type {
  CustomConverterFn,
  CustomValidatorFn,
  JSchema,
  JsonSchemaIsoDateOptions,
  JsonSchemaStringEmailOptions,
  JsonSchemaUtcOffsetOptions,
} from './jSchema.js'
import { jFormats } from './jsonSchemaBuilder.util.js'

// oxlint-disable unicorn/prefer-code-point

const AJV_OPTIONS: Options = {
  removeAdditional: true,
  allErrors: true,
  // https://ajv.js.org/options.html#usedefaults
  useDefaults: 'empty', // this will mutate your input!
  // these are important and kept same as default:
  // https://ajv.js.org/options.html#coercetypes
  coerceTypes: false, // while `false` - it won't mutate your input
  strictTypes: true,
  strictTuples: true,
  allowUnionTypes: true, // supports oneOf/anyOf schemas
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

        if (ctx?.parentData && ctx.parentDataProperty !== undefined) {
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

        if (ctx?.parentData && ctx.parentDataProperty !== undefined) {
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

      if (ctx?.parentData && ctx.parentDataProperty !== undefined) {
        ctx.parentData[ctx.parentDataProperty] = cleanData
      }

      return true
    },
  })

  // The date/time keywords are `code` keywords, which Ajv inlines into the compiled validator.
  // A `validate` keyword is a function call with a context object, whose instancePath Ajv builds
  // on every call (escaping the key of every map entry), even for valid data.
  ajv.addKeyword({
    keyword: 'IsoDate',
    type: 'string',
    schemaType: 'object',
    error: {
      message: ({ params }) =>
        params['rule']
          ? str`is not ${isoDateRuleLabels[params['rule'] as IsoDateRule]} ${params['limit']}`
          : str`is an invalid IsoDate`,
      params: ({ params }) => (params['rule'] ? _`{${params['rule']}: ${params['limit']}}` : _`{}`),
    },
    code(cxt: KeywordCxt) {
      const { gen, data } = cxt
      const opt: JsonSchemaIsoDateOptions = cxt.schema
      const isValid = gen.scopeValue('func', { ref: isIsoDateValid })

      gen.if(
        _`!${isValid}(${data})`,
        () => cxt.error(),
        () => {
          for (const rule of isoDateRules) {
            const limit = opt[rule]
            if (!limit) continue

            const params = { rule, limit }
            if (!isIsoDateValid(limit)) {
              // An invalid limit rejects every date
              cxt.error(false, params)
              continue
            }
            gen.if(isoDateRuleFails(rule, data, limit), () => cxt.error(false, params))
          }
        },
      )
    },
  })

  ajv.addKeyword({
    keyword: 'IsoDateTime',
    type: 'string',
    schemaType: 'boolean',
    error: { message: 'is an invalid IsoDateTime' },
    code(cxt: KeywordCxt) {
      const isValid = cxt.gen.scopeValue('func', { ref: isIsoDateTimeValid })
      cxt.fail(_`!${isValid}(${cxt.data})`)
    },
  })

  ajv.addKeyword({
    keyword: 'IsoMonth',
    type: 'string',
    schemaType: 'object',
    error: { message: 'is an invalid IsoMonth' },
    code(cxt: KeywordCxt) {
      const isValid = cxt.gen.scopeValue('func', { ref: isIsoMonthValid })
      cxt.fail(_`!${isValid}(${cxt.data})`)
    },
  })

  ajv.addKeyword({
    keyword: 'UtcOffset',
    type: 'string',
    schemaType: 'object',
    error: { message: 'is an invalid UtcOffset' },
    code(cxt: KeywordCxt) {
      const opt: JsonSchemaUtcOffsetOptions = cxt.schema
      const isValid = cxt.gen.scopeValue('func', {
        ref: opt.allowZ ? isUtcOffsetOrZValid : isUtcOffsetValid,
      })
      cxt.fail(_`!${isValid}(${cxt.data})`)
    },
  })

  // Annotation only (the values are validated by `enum`), registered so strict mode doesn't reject it
  ajv.addKeyword({
    keyword: 'enumNames',
    schemaType: 'array',
  })

  // Annotation only (validated by the custom keywords, e.g `IsoDate`).
  // `true` makes Ajv skip the format check, while unknown formats would throw in strict mode.
  for (const format of jFormats) {
    ajv.addFormat(format, true)
  }

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
    type: ['string', 'number', 'boolean', 'null'],
    modifying: true,
    errors: false,
    schemaType: 'array',
    validate: function validate(
      optionalValues: readonly (string | number | boolean)[],
      data: string | number | boolean,
      _schema,
      ctx,
    ) {
      if (!optionalValues) return true

      _assert(
        ctx?.parentData && ctx.parentDataProperty !== undefined,
        'You should only use `optional([x, y, z])` on a property of an object, or on an element of an array due to Ajv mutation issues.',
      )

      if (!optionalValues.includes(data)) return true

      ctx.parentData[ctx.parentDataProperty] = undefined

      return true
    },
  })

  // Strips the keys that don't match the key schema; the values are validated by `additionalProperties`.
  // The key schema is inlined per key with error reporting off, and the error count is reset after
  // a mismatch, so a stripped key never surfaces as an error. Keys listed in `properties` are skipped.
  ajv.addKeyword({
    keyword: 'keySchema',
    type: 'object',
    schemaType: 'object',
    trackErrors: true,
    code(cxt: KeywordCxt) {
      const { gen, data, parentSchema } = cxt
      const propertyNames = Object.keys(parentSchema['properties'] || {})
      const valid = gen.name('valid')

      gen.forIn('key', data, key => {
        const checkKey = (): void => {
          cxt.subschema(
            {
              keyword: 'keySchema',
              data: key,
              dataTypes: ['string'],
              compositeRule: true,
              createErrors: false,
              allErrors: false,
            },
            valid,
          )
          gen.if(_`!${valid}`, () => {
            cxt.reset()
            gen.code(_`delete ${data}[${key}]`)
          })
        }

        if (!propertyNames.length) return checkKey()

        let isNotProperty: Code = _`${key} !== ${propertyNames[0]}`
        for (const name of propertyNames.slice(1)) {
          isNotProperty = _`${isNotProperty} && ${key} !== ${name}`
        }
        gen.if(isNotProperty, checkKey)
      })
    },
  })

  // Validates the inner schema only when the value is defined. Used for the optional values of
  // `stringMap`/`record`, whose `additionalProperties` loop visits the keys with undefined values too.
  ajv.addKeyword({
    keyword: 'ifDefined',
    schemaType: ['object', 'boolean'],
    code(cxt: KeywordCxt) {
      const { gen, data } = cxt
      gen.if(_`${data} !== undefined`, () => {
        cxt.subschema({ keyword: 'ifDefined' }, gen.name('valid'))
      })
    },
  })

  // Validates that the value is undefined. Superseded by `ifDefined`, kept for raw JSON schemas.
  ajv.addKeyword({
    keyword: 'isUndefined',
    schemaType: 'boolean',
    code(cxt: KeywordCxt) {
      cxt.fail(_`${cxt.data} !== undefined`)
    },
  })

  // This is added because Ajv validates the `min/maxProperties` before validating the properties.
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

      const numberOfProperties = Object.entries(data).filter(([, v]) => v !== undefined).length
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

  ajv.addKeyword({
    keyword: 'exclusiveProperties',
    type: 'object',
    modifying: false,
    errors: true,
    schemaType: 'array',
    validate: function validate(
      exclusiveProperties: readonly string[][],
      data: AnyObject,
      _schema,
      ctx,
    ) {
      if (typeof data !== 'object') return true

      for (const props of exclusiveProperties) {
        let numberOfDefinedProperties = 0
        for (const prop of props) {
          if (data[prop] !== undefined) numberOfDefinedProperties++
          if (numberOfDefinedProperties > 1) {
            ;(validate as any).errors = [
              {
                instancePath: ctx?.instancePath ?? '',
                message: `must have only one of the "${props.join(', ')}" properties`,
              },
            ]
            return false
          }
        }
      }

      return true
    },
  })

  ajv.addKeyword({
    keyword: 'anyOfBy',
    type: 'object',
    modifying: true,
    errors: true,
    schemaType: 'object',
    compile(config, _parentSchema, _it) {
      const { propertyName, schemaDictionary } = config

      const isValidFnByKey: Record<any, ValidateFunction> = _mapObject(
        schemaDictionary as Record<any, JSchema<any, any>>,
        (key, value) => {
          return [key, ajv.compile(value)]
        },
      )

      function validate(data: AnyObject, ctx: any): boolean {
        if (typeof data !== 'object' || data === null) return true

        const determinant = data[propertyName]
        const isValidFn = isValidFnByKey[determinant]
        if (!isValidFn) {
          ;(validate as any).errors = [
            {
              instancePath: ctx?.instancePath ?? '',
              message: `could not find a suitable schema to validate against based on "${propertyName}"`,
            },
          ]
          return false
        }

        const result = isValidFn(data)
        if (!result) {
          ;(validate as any).errors = isValidFn.errors
        }
        return result
      }

      return validate
    },
  })

  ajv.addKeyword({
    keyword: 'anyOfThese',
    modifying: true,
    errors: true,
    schemaType: 'array',
    compile(schemas: readonly JSchema<any, any>[], _parentSchema, _it) {
      const validators = schemas.map(schema => ajv.compile(schema))

      function validate(data: AnyObject, ctx: any): boolean {
        let correctValidator: ValidateFunction<unknown> | undefined
        let result = false
        let clonedData: any

        // Try each validator until we find one that works!
        for (const validator of validators) {
          clonedData = isPrimitive(data) ? _deepCopy(data) : data
          result = validator(clonedData)
          if (result) {
            correctValidator = validator
            break
          }
        }

        if (result && ctx?.parentData && ctx.parentDataProperty !== undefined) {
          // If we found a validator and the data is valid and we are validating a property inside an object,
          // then we can inject our result and be done with it.
          ctx.parentData[ctx.parentDataProperty] = clonedData
        } else if (result) {
          // If we found a validator but we are not validating a property inside an object,
          // then we must re-run the validation so that the mutations caused by Ajv
          // will be done on the input data, not only on the clone.
          result = correctValidator!(data)
        } else {
          // If we didn't find a fitting schema,
          // we add our own error.
          ;(validate as any).errors = [
            {
              instancePath: ctx?.instancePath ?? '',
              message: `could not find a suitable schema to validate against`,
            },
          ]
        }

        return result
      }

      return validate
    },
  })

  ajv.addKeyword({
    keyword: 'precision',
    type: ['number'],
    modifying: true,
    errors: false,
    schemaType: 'number',
    validate: function validate(numberOfDigits: number, data: number, _schema, ctx) {
      if (!numberOfDigits) return true

      _assert(
        ctx?.parentData && ctx.parentDataProperty !== undefined,
        'You should only use `precision(n)` on a property of an object, or on an element of an array due to Ajv mutation issues.',
      )

      ctx.parentData[ctx.parentDataProperty] = _round(data, 10 ** (-1 * numberOfDigits))

      return true
    },
  })

  ajv.addKeyword({
    keyword: 'customValidations',
    modifying: false,
    errors: true,
    schemaType: 'array',
    validate: function validate(
      customValidations: readonly CustomValidatorFn[],
      data: any,
      _schema,
      ctx,
    ) {
      if (!customValidations?.length) return true

      for (const validator of customValidations) {
        const error = validator(data)
        if (error) {
          ;(validate as any).errors = [
            {
              instancePath: ctx?.instancePath ?? '',
              message: error,
            },
          ]
          return false
        }
      }

      return true
    },
  })

  ajv.addKeyword({
    keyword: 'customConversions',
    modifying: true,
    errors: false,
    schemaType: 'array',
    validate: function validate(
      customConversions: readonly CustomConverterFn<any>[],
      data: any,
      _schema,
      ctx,
    ) {
      if (!customConversions?.length) return true

      _assert(
        ctx?.parentData && ctx.parentDataProperty !== undefined,
        'You should only use `convert()` on a property of an object, or on an element of an array due to Ajv mutation issues.',
      )

      for (const converter of customConversions) {
        data = converter(data)
      }

      ctx.parentData[ctx.parentDataProperty] = data

      return true
    },
  })

  // postValidation is handled in AjvSchema.getValidationResult, not by Ajv itself.
  // We register it here so Ajv's strict mode doesn't reject the keyword.
  ajv.addKeyword({
    keyword: 'postValidation',
    valid: true,
  })

  return ajv
}

type IsoDateRule = keyof JsonSchemaIsoDateOptions

const isoDateRules: IsoDateRule[] = ['before', 'sameOrBefore', 'after', 'sameOrAfter']

const isoDateRuleLabels: Record<IsoDateRule, string> = {
  before: 'before',
  sameOrBefore: 'the same or before',
  after: 'after',
  sameOrAfter: 'the same or after',
}

/**
 * IsoDate strings compare chronologically as plain strings.
 */
function isoDateRuleFails(rule: IsoDateRule, data: Code, limit: string): Code {
  if (rule === 'before') return _`${data} >= ${limit}`
  if (rule === 'sameOrBefore') return _`${data} > ${limit}`
  if (rule === 'after') return _`${data} <= ${limit}`
  return _`${data} < ${limit}`
}

const monthLengths = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

const DASH_CODE = '-'.charCodeAt(0)
const ZERO_CODE = '0'.charCodeAt(0)
const NINE_CODE = '9'.charCodeAt(0)
const PLUS_CODE = '+'.charCodeAt(0)
const COLON_CODE = ':'.charCodeAt(0)
const DOT_CODE = '.'.charCodeAt(0)

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
  const year = parseDigits(s, 0, 4)

  const month = parseDigits(s, 5, 2)
  const day = parseDigits(s, 8, 2)

  if (year < 0 || month < 1 || month > 12 || day < 1) return false

  if (month !== 2) {
    return day <= monthLengths[month]!
  }

  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  return day <= (isLeap ? 29 : 28)
}

/**
 * This is a performance optimized correct validation
 * for ISO datetimes formatted as "YYYY-MM-DDTHH:MM:SS",
 * optionally followed by fractional seconds of 1 to 9 digits (e.g. ".231" or ".231263"),
 * followed by nothing, "Z" or "+hh:mm" or "-hh:mm".
 *
 * - Slightly more performant than using `localTime`.
 * - More performant than string splitting and `Number()` conversions
 * - Less performant than regex, but it does not allow invalid dates.
 */
function isIsoDateTimeValid(s: string): boolean {
  if (s.length < 19 || s.length > 35) return false
  if (s.charCodeAt(10) !== 84) return false // 'T'

  const datePart = s.slice(0, 10) // YYYY-MM-DD
  if (!isIsoDateValid(datePart)) return false

  const timePart = s.slice(11, 19) // HH:MM:SS
  if (!isIsoTimeValid(timePart)) return false

  let zoneStart = 19
  if (s.charCodeAt(19) === DOT_CODE) {
    zoneStart = 20
    while (isDigitCode(s.charCodeAt(zoneStart))) zoneStart++
    const fractionDigits = zoneStart - 20
    if (fractionDigits < 1 || fractionDigits > 9) return false
  }

  const zonePart = s.slice(zoneStart) // nothing or Z or +/-hh:mm
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

  const hour = parseDigits(s, 0, 2)
  if (hour < 0 || hour > 23) return false

  const minute = parseDigits(s, 3, 2)
  if (minute < 0 || minute > 59) return false

  const second = parseDigits(s, 6, 2)
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

  const hour = parseDigits(s, 1, 2)
  if (hour < 0) return false
  if (isWestern && hour > 12) return false
  if (isEastern && hour > 14) return false

  const minute = parseDigits(s, 4, 2)
  if (minute < 0 || minute > 59) return false

  if (isEastern && hour === 14 && minute > 0) return false // max is +14:00
  if (isWestern && hour === 12 && minute > 0) return false // min is -12:00

  return true
}

function isUtcOffsetValid(s: string): boolean {
  return s !== 'Z' && s !== '' && isIsoTimezoneValid(s)
}

function isUtcOffsetOrZValid(s: string): boolean {
  return s === 'Z' || (s !== '' && isIsoTimezoneValid(s))
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
  const year = parseDigits(s, 0, 4)

  const month = parseDigits(s, 5, 2)

  return _isBetween(year, 1900, 2500, '[]') && _isBetween(month, 1, 12, '[]')
}

function parseDigits(s: string, start: number, count: number): number {
  let value = 0
  for (let i = start; i < start + count; i++) {
    const code = s.charCodeAt(i)
    if (!isDigitCode(code)) return -1
    value = value * 10 + code - ZERO_CODE
  }
  return value
}

function isDigitCode(code: number): boolean {
  return code >= ZERO_CODE && code <= NINE_CODE
}

function isPrimitive(data: any): boolean {
  return data !== null && typeof data === 'object'
}
