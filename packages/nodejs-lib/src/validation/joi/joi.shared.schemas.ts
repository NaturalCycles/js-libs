import {
  _numberEnumKeys,
  _numberEnumValues,
  _stringEnumKeys,
  _stringEnumValues,
} from '@naturalcycles/js-lib'
import {
  type AnyObject,
  type BaseDBEntity,
  type IANATimezone,
  type IsoDate,
  type IsoDateTime,
  JWT_REGEX,
  type NumberEnum,
  type StringEnum,
  type StringMap,
  type UnixTimestamp,
  type UnixTimestampMillis,
} from '@naturalcycles/js-lib/types'
import type { AlternativesSchema, AnySchema, ArraySchema, ObjectSchema } from 'joi'
import {
  BASE62_REGEX,
  BASE64_REGEX,
  BASE64URL_REGEX,
  ID_REGEX,
  MAC_ADDRESS_REGEX,
  SEMVER_REGEX,
  SLUG_REGEX,
} from '../regexes.js'
import { Joi } from './joi.extensions.js'
import type { NumberSchema } from './number.extensions.js'
import type { StringSchema } from './string.extensions.js'

export const booleanSchema = Joi.boolean()
export const booleanDefaultToFalseSchema = Joi.boolean().default(false)
export const stringSchema = Joi.string()
export const stringSchemaTyped = <T>(): StringSchema<T> => Joi.string<T>()
export const numberSchema = Joi.number()
export const numberSchemaTyped = <T>(): NumberSchema<T> => Joi.number<T>()
export const integerSchema = Joi.number().integer()
export const percentageSchema = Joi.number().integer().min(0).max(100)
export const dateStringSchema: StringSchema<IsoDate> = stringSchema.dateString()
export const binarySchema = Joi.binary()
export const dateObjectSchema = Joi.object().instance(Date)

const DATE_INTERVAL_REGEX = /^\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}$/
export const dateIntervalStringSchema = stringSchema.regex(DATE_INTERVAL_REGEX).messages({
  'string.pattern.base': `must be a DateInterval string`,
})

export const DATE_TIME_STRING_REGEX =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})?)?$/

export const dateTimeStringSchema = stringSchema.regex(DATE_TIME_STRING_REGEX).messages({
  'string.pattern.base': `must be a DateTime string`,
}) as StringSchema<IsoDateTime>

/**
 * Allows all values of a String Enum.
 */
export const stringEnumValueSchema = <ENUM extends StringEnum>(
  en: ENUM,
): StringSchema<ENUM[keyof ENUM]> => Joi.string<ENUM[keyof ENUM]>().valid(..._stringEnumValues(en))

/**
 * Allows all keys of a String Enum.
 */
export const stringEnumKeySchema = <ENUM extends StringEnum>(en: ENUM): StringSchema =>
  Joi.string().valid(..._stringEnumKeys(en))

/**
 * Allows all values of a String Enum.
 */
export const numberEnumValueSchema = <ENUM extends NumberEnum>(
  en: ENUM,
): NumberSchema<ENUM[keyof ENUM]> => Joi.number<ENUM[keyof ENUM]>().valid(..._numberEnumValues(en))

/**
 * Allows all keys of a Number Enum.
 */
export const numberEnumKeySchema = <ENUM extends NumberEnum>(en: ENUM): StringSchema =>
  Joi.string().valid(..._numberEnumKeys(en))

export const urlSchema = (scheme: string | string[] = 'https'): StringSchema =>
  Joi.string().uri({ scheme })

export function arraySchema<T>(items: AnySchema<T>): ArraySchema<T[]> {
  return Joi.array().items(items)
}

export function anyObjectSchema<T extends AnyObject>(): ObjectSchema<T> {
  return Joi.object().options({ stripUnknown: false })
}

export function objectSchema<T extends AnyObject>(schema: {
  [key in keyof Partial<T>]: AnySchema<T[key]>
}): ObjectSchema<T> {
  return Joi.object(schema)
}

export function stringMapSchema<T>(
  key: AnySchema,
  value: AnySchema<T>,
): ObjectSchema<StringMap<T>> {
  return Joi.object().pattern(key, value)
}

export function oneOfSchema<T = any>(...schemas: AnySchema[]): AlternativesSchema<T> {
  return Joi.alternatives(schemas)
}

export const anySchema = Joi.any()
export const base62Schema = stringSchema.regex(BASE62_REGEX)
export const base64Schema = stringSchema.regex(BASE64_REGEX)
export const base64UrlSchema = stringSchema.regex(BASE64URL_REGEX)

export const jwtSchema = stringSchema.regex(JWT_REGEX)

// 1g498efj5sder3324zer
/**
 * [a-zA-Z0-9_]*
 * 6-64 length
 */
export const idSchema = stringSchema.regex(ID_REGEX)

export const idBase62Schema = base62Schema.min(8).max(64)
export const idBase64Schema = base64Schema.min(8).max(64)
export const idBase64UrlSchema = base64UrlSchema.min(8).max(64)

/**
 * "Slug" - a valid URL, filename, etc.
 */
export const slugSchema = stringSchema.regex(SLUG_REGEX).min(1).max(255)

const TS_2500 = 16725225600 // 2500-01-01
const TS_2000 = 946684800 // 2000-01-01

/**
 * Between years 1970 and 2050
 */
export const unixTimestampSchema = numberSchema
  .integer()
  .min(0)
  .max(TS_2500) as NumberSchema<UnixTimestamp>
/**
 * Between years 2000 and 2050
 */
export const unixTimestamp2000Schema = numberSchema
  .integer()
  .min(TS_2000)
  .max(TS_2500) as NumberSchema<UnixTimestamp>
/**
 * Between years 1970 and 2050
 */
export const unixTimestampMillisSchema = numberSchema
  .integer()
  .min(0)
  .max(TS_2500 * 1000) as NumberSchema<UnixTimestampMillis>
/**
 * Between years 2000 and 2050
 */
export const unixTimestampMillis2000Schema = numberSchema
  .integer()
  .min(TS_2000 * 1000)
  .max(TS_2500 * 1000) as NumberSchema<UnixTimestampMillis>

// 2
export const verSchema = numberSchema.optional().integer().min(1).max(100)

/**
 * Be careful, by default emailSchema does TLD validation. To disable it - use `stringSchema.email({tld: false}).lowercase()`
 */
export const emailSchema = stringSchema.email().lowercase()

/**
 * Pattern is simplified for our use, it's not a canonical SemVer.
 */
export const semVerSchema = stringSchema.regex(SEMVER_REGEX)
// todo: .error(() => 'should be SemVer')

export const userAgentSchema = stringSchema
  .min(5) // I've seen UA of `Android` (7 characters)
  .max(400)

export const utcOffsetSchema = numberSchema
  .min(-14 * 60)
  .max(14 * 60)
  .dividable(15)

export const ianaTimezoneSchema = stringSchema
  // UTC is added to assist unit-testing, which uses UTC by default (not technically a valid Iana timezone identifier)
  .valid(...Intl.supportedValuesOf('timeZone'), 'UTC')
  .messages({
    'any.only': `must be a valid IANA timezone string`,
  }) as StringSchema<IANATimezone>

export const ipAddressSchema = stringSchema.ip()

export const baseDBEntitySchema: ObjectSchema<BaseDBEntity> = objectSchema<BaseDBEntity>({
  id: stringSchema.optional(),
  created: unixTimestamp2000Schema.optional(),
  updated: unixTimestamp2000Schema.optional(),
})

export const macAddressSchema = stringSchema.regex(MAC_ADDRESS_REGEX)

export const uuidSchema = stringSchema.uuid()
