import type { ZodString } from 'zod'
import { z } from 'zod'
import { localDate } from '../datetime/localDate.js'
import { _assert } from '../error/assert.js'
import {
  _typeCast,
  type IANATimezone,
  type Inclusiveness,
  type IsoDate,
  type UnixTimestamp,
  type UnixTimestampMillis,
} from '../types.js'

type ZodBranded<T, B> = T & Record<'_zod', Record<'output', B>>
export type ZodBrandedString<B> = ZodBranded<z.ZodString, B>
export type ZodBrandedInt<B> = ZodBranded<z.ZodInt, B>
export type ZodBrandedNumber<B> = ZodBranded<z.ZodNumber, B>
export type ZodBrandedIsoDate = ZodBranded<z.ZodISODate, IsoDate>

const TS_2500 = 16725225600 // 2500-01-01
const TS_2000 = 946684800 // 2000-01-01

function unixTimestamp(): ZodBrandedInt<UnixTimestamp> {
  return z
    .number()
    .int()
    .min(0)
    .max(TS_2500, 'Must be a UnixTimestamp number')
    .describe('UnixTimestamp') as ZodBrandedInt<UnixTimestamp>
}

function unixTimestamp2000(): ZodBrandedInt<UnixTimestamp> {
  return z
    .number()
    .int()
    .min(TS_2000)
    .max(TS_2500, 'Must be a UnixTimestamp number after 2000-01-01')
    .describe('UnixTimestamp2000') as ZodBrandedInt<UnixTimestamp>
}

function unixTimestampMillis(): ZodBranded<z.ZodNumber, UnixTimestampMillis> {
  return z
    .number()
    .int()
    .min(0)
    .max(TS_2500 * 1000, 'Must be a UnixTimestampMillis number')
    .describe('UnixTimestampMillis') as ZodBrandedInt<UnixTimestampMillis>
}

function unixTimestampMillis2000(): ZodBrandedInt<UnixTimestampMillis> {
  return z
    .number()
    .int()
    .min(TS_2000 * 1000)
    .max(TS_2500 * 1000, 'Must be a UnixTimestampMillis number after 2000-01-01')
    .describe('UnixTimestampMillis2000') as ZodBrandedInt<UnixTimestampMillis>
}

function semVer(): z.ZodString {
  return z
    .string()
    .regex(/^[0-9]+\.[0-9]+\.[0-9]+$/, 'Must be a SemVer string')
    .describe('SemVer')
}

export interface CustomZodIsoDateParams {
  before?: IsoDate
  sameOrBefore?: IsoDate
  after?: IsoDate
  sameOrAfter?: IsoDate
  between?: { min: IsoDate; max: IsoDate; incl: Inclusiveness }
}

export interface JsonSchemaDescriptionParams {
  schema: 'isoDate'
  params: CustomZodIsoDateParams
}

function isoDate(params: CustomZodIsoDateParams = {}): ZodBrandedString<IsoDate> {
  const { before, sameOrBefore, after, sameOrAfter, between } = params

  _assert(Object.keys(params).length <= 1, 'Only one condition is allowed in `isoDate()`!')

  let error = 'Should be be a YYYY-MM-DD string'
  if (after) error = `Should be after ${after}`
  if (sameOrAfter) error = `Should be on or after ${sameOrAfter}`
  if (before) error = `Should be before ${before}`
  if (sameOrBefore) error = `Should be on or before ${sameOrBefore}`
  if (between) {
    const { min, max, incl } = between
    error = `Should be between ${min} and ${max} (incl: ${incl})`
  }

  let schema = z.string().refine(
    dateString => {
      if (!localDate.isValidString(dateString)) return false
      _typeCast<IsoDate>(dateString)

      const ld = localDate.fromString(dateString)

      if (before) return ld.isBefore(before)
      if (sameOrBefore) return ld.isSameOrBefore(sameOrBefore)
      if (after) return ld.isAfter(after)
      if (sameOrAfter) return ld.isSameOrAfter(sameOrAfter)
      if (between) return ld.isBetween(between.min, between.max, between.incl)

      return true
    },
    { error },
  )

  // Here we hide the instructions in the description that Ajv will understand
  // For some reason, if I add the `.describe()` earlier to support early-return when no conditions are specified,
  // then the description is lost. It seems it must be the last call in the call chain.
  const description = { schema: 'isoDate', params } satisfies JsonSchemaDescriptionParams
  schema = schema.describe(JSON.stringify(description))

  return schema as ZodBrandedString<IsoDate>
}

function email(): z.ZodEmail {
  return z.email().describe('Email')
}

const BASE62_REGEX = /^[a-zA-Z0-9]+$/
const BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/
const BASE64URL_REGEX = /^[\w\-/]+$/

function base62(): z.ZodString {
  return z.string().regex(BASE62_REGEX, 'Must be a base62 string').describe('Base62String')
}

function base64(): z.ZodString {
  return z.string().regex(BASE64_REGEX, 'Must be a base64 string').describe('Base64String')
}

function base64Url(): z.ZodString {
  return z.string().regex(BASE64URL_REGEX, 'Must be a base64url string').describe('Base64UrlString')
}

const JWT_REGEX = /^[\w-]+\.[\w-]+\.[\w-]+$/

function jwt(): z.ZodString {
  return z.string().regex(JWT_REGEX, 'Must be a JWT string').describe('JWTString')
}

/**
 * "Slug" - a valid URL, filename, etc.
 */
function slug(): z.ZodString {
  return z
    .string()
    .regex(/^[a-z0-9-]{1,255}$/, 'Must be a slug string')
    .describe('Slug')
}

function ianaTimezone(): ZodBrandedString<IANATimezone> {
  return (
    z
      // UTC is added to assist unit-testing, which uses UTC by default (not technically a valid Iana timezone identifier)
      .enum([...Intl.supportedValuesOf('timeZone'), 'UTC'])
      .describe('IANATimezone') as unknown as ZodBrandedString<IANATimezone>
  )
}

const baseDBEntitySchema = z.object({
  id: z.string(),
  created: unixTimestamp2000(),
  updated: unixTimestamp2000(),
})

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type BaseDBEntityZodShape = {
  id: ZodString
  created: ZodBrandedInt<UnixTimestamp>
  updated: ZodBrandedInt<UnixTimestamp>
}

function dbEntity(): z.ZodObject<BaseDBEntityZodShape>
function dbEntity<T extends z.ZodRawShape>(shape: T): z.ZodObject<BaseDBEntityZodShape & T>

function dbEntity<T extends z.ZodRawShape>(shape?: T): z.ZodObject<BaseDBEntityZodShape & T> {
  return baseDBEntitySchema.extend(shape ?? {}) as z.ZodObject<BaseDBEntityZodShape & T>
}

export const customZodSchemas = {
  base62,
  base64,
  base64Url,
  dbEntity,
  email,
  ianaTimezone,
  isoDate,
  jwt,
  slug,
  semver: semVer,
  unixTimestamp,
  unixTimestamp2000,
  unixTimestampMillis,
  unixTimestampMillis2000,
}
