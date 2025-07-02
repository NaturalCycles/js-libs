import { z, type ZodType } from 'zod/v4'

export const TS_2500 = 16725225600 // 2500-01-01
export const TS_2000 = 946684800 // 2000-01-01

export const zUnixTimestamp = (): z.ZodNumber =>
  z
    .number()
    .int()
    .min(0)
    .max(TS_2500, 'Must be a UnixTimestamp number')
    // .transform(v => v as UnixTimestamp) // breaks jsonSchema
    .describe('UnixTimestamp')

export const zUnixTimestamp2000 = (): z.ZodNumber =>
  z
    .number()
    .int()
    .min(TS_2000)
    .max(TS_2500, 'Must be a UnixTimestamp number after 2000-01-01')
    // .transform(v => v as UnixTimestamp)
    .describe('UnixTimestamp2000')

export const zUnixTimestampMillis = (): z.ZodNumber =>
  z
    .number()
    .int()
    .min(0)
    .max(TS_2500 * 1000, 'Must be a UnixTimestampMillis number')
    // .transform(v => v as UnixTimestampMillis)
    .describe('UnixTimestampMillis')

export const zUnixTimestampMillis2000 = (): z.ZodNumber =>
  z
    .number()
    .int()
    .min(TS_2000 * 1000)
    .max(TS_2500 * 1000, 'Must be a UnixTimestampMillis number after 2000-01-01')
    // .transform(v => v as UnixTimestampMillis)
    .describe('UnixTimestampMillis2000')

export const zSemVer = (): z.ZodString =>
  z
    .string()
    .regex(/^[0-9]+\.[0-9]+\.[0-9]+$/, 'Must be a SemVer string')
    .describe('SemVer')

export const zIsoDate = (): z.ZodString =>
  z
    .string()
    .refine(v => {
      return /^\d{4}-\d{2}-\d{2}$/.test(v)
    }, 'Must be an IsoDateString')
    .describe('IsoDateString')

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
