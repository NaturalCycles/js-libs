import type { ZodString } from 'zod'
import { z } from 'zod'
import type { IsoDate, UnixTimestamp, UnixTimestampMillis } from '../types.js'

type ZodBranded<T, B> = T & Record<'_zod', Record<'output', number & B>>
export type ZodBrandedString<B> = ZodBranded<z.ZodString, B>
export type ZodBrandedInt<B> = ZodBranded<z.ZodInt, B>
export type ZodBrandedNumber<B> = ZodBranded<z.ZodNumber, B>

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

function isoDate(): ZodBrandedString<IsoDate> {
  return z
    .string()
    .refine(v => {
      return /^\d{4}-\d{2}-\d{2}$/.test(v)
    }, 'Must be an IsoDateString')
    .describe('IsoDateString') as ZodBrandedString<IsoDate>
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

function ianaTimezone(): z.ZodEnum {
  return (
    z
      // UTC is added to assist unit-testing, which uses UTC by default (not technically a valid Iana timezone identifier)
      .enum([...Intl.supportedValuesOf('timeZone'), 'UTC'])
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
