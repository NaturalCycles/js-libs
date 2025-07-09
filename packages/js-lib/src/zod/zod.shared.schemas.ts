import { z } from 'zod'
import type { IsoDate, UnixTimestamp, UnixTimestampMillis } from '../types.js'

type ZodBranded<T, B> = T & Record<'_zod', Record<'output', number & B>>
export type ZodBrandedString<B> = ZodBranded<z.ZodString, B>
export type ZodBrandedInt<B> = ZodBranded<z.ZodInt, B>
export type ZodBrandedNumber<B> = ZodBranded<z.ZodNumber, B>

export const TS_2500 = 16725225600 // 2500-01-01
export const TS_2000 = 946684800 // 2000-01-01

export const zUnixTimestamp = (): ZodBrandedInt<UnixTimestamp> =>
  z
    .number()
    .int()
    .min(0)
    .max(TS_2500, 'Must be a UnixTimestamp number')
    .describe('UnixTimestamp') as ZodBrandedInt<UnixTimestamp>

export const zUnixTimestamp2000 = (): ZodBrandedInt<UnixTimestamp> =>
  z
    .number()
    .int()
    .min(TS_2000)
    .max(TS_2500, 'Must be a UnixTimestamp number after 2000-01-01')
    .describe('UnixTimestamp2000') as ZodBrandedInt<UnixTimestamp>

export const zUnixTimestampMillis = (): ZodBranded<z.ZodNumber, UnixTimestampMillis> =>
  z
    .number()
    .int()
    .min(0)
    .max(TS_2500 * 1000, 'Must be a UnixTimestampMillis number')
    .describe('UnixTimestampMillis') as ZodBrandedInt<UnixTimestampMillis>

export const zUnixTimestampMillis2000 = (): ZodBrandedInt<UnixTimestampMillis> =>
  z
    .number()
    .int()
    .min(TS_2000 * 1000)
    .max(TS_2500 * 1000, 'Must be a UnixTimestampMillis number after 2000-01-01')
    .describe('UnixTimestampMillis2000') as ZodBrandedInt<UnixTimestampMillis>

export const zSemVer = (): z.ZodString =>
  z
    .string()
    .regex(/^[0-9]+\.[0-9]+\.[0-9]+$/, 'Must be a SemVer string')
    .describe('SemVer')

export const zIsoDate = (): ZodBrandedString<IsoDate> =>
  z
    .string()
    .refine(v => {
      return /^\d{4}-\d{2}-\d{2}$/.test(v)
    }, 'Must be an IsoDateString')
    .describe('IsoDateString') as ZodBrandedString<IsoDate>

export const zEmail = (): z.ZodEmail => z.email().describe('Email')

export const BASE62_REGEX = /^[a-zA-Z0-9]+$/
export const BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/
export const BASE64URL_REGEX = /^[\w\-/]+$/

export const zBase62 = (): z.ZodString =>
  z.string().regex(BASE62_REGEX, 'Must be a base62 string').describe('Base62String')

export const zBase64 = (): z.ZodString =>
  z.string().regex(BASE64_REGEX, 'Must be a base64 string').describe('Base64String')

export const zBase64Url = (): z.ZodString =>
  z.string().regex(BASE64URL_REGEX, 'Must be a base64url string').describe('Base64UrlString')

export const JWT_REGEX = /^[\w-]+\.[\w-]+\.[\w-]+$/
export const zJwt = (): z.ZodString =>
  z.string().regex(JWT_REGEX, 'Must be a JWT string').describe('JWTString')

/**
 * "Slug" - a valid URL, filename, etc.
 */
export const zSlug = (): z.ZodString =>
  z
    .string()
    .regex(/^[a-z0-9-]{1,255}$/, 'Must be a slug string')
    .describe('Slug')

export const zIanaTimezone = (): z.ZodEnum =>
  z
    // UTC is added to assist unit-testing, which uses UTC by default (not technically a valid Iana timezone identifier)
    .enum([...Intl.supportedValuesOf('timeZone'), 'UTC'])

export const customZodSchemas = {
  base62: zBase62,
  base64: zBase64,
  base64Url: zBase64Url,
  email: zEmail,
  ianaTimezone: zIanaTimezone,
  isoDate: zIsoDate,
  jwt: zJwt,
  slug: zSlug,
  semver: zSemVer,
  unixTimestamp: zUnixTimestamp,
  unixTimestamp2000: zUnixTimestamp2000,
  unixTimestampMillis: zUnixTimestampMillis,
  unixTimestampMillis2000: zUnixTimestampMillis2000,
}
