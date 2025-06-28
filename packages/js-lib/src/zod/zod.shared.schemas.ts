import { z } from 'zod/v4'

export const TS_2500 = 16725225600 // 2500-01-01
export const TS_2000 = 946684800 // 2000-01-01

export const zUnixTimestamp = z
  .number()
  .int()
  .min(0)
  .max(TS_2500, 'Must be a UnixTimestamp number')
  .describe('UnixTimestamp')
export const zUnixTimestamp2000 = z
  .number()
  .int()
  .min(TS_2000)
  .max(TS_2500, 'Must be a UnixTimestamp number after 2000-01-01')
  .describe('UnixTimestamp2000')
export const zUnixTimestampMillis = z
  .number()
  .int()
  .min(0)
  .max(TS_2500 * 1000, 'Must be a UnixTimestampMillis number')
  .describe('UnixTimestampMillis')
export const zUnixTimestampMillis2000 = z
  .number()
  .int()
  .min(TS_2000 * 1000)
  .max(TS_2500 * 1000, 'Must be a UnixTimestampMillis number after 2000-01-01')
  .describe('UnixTimestampMillis2000')

export const zSemVer = z
  .string()
  .regex(/^[0-9]+\.[0-9]+\.[0-9]+$/, 'Must be a SemVer string')
  .describe('SemVer')

export const zIsoDateString = z
  .string()
  .refine(v => {
    return /^\d{4}-\d{2}-\d{2}$/.test(v)
  }, 'Must be an IsoDateString')
  .describe('IsoDateString')

export const zEmail = z
  .string()
  .trim()
  .email() // keeping as-is, so trim happens before email validation
  .transform(s => s.toLowerCase())
  .describe('Email')

export const BASE62_REGEX = /^[a-zA-Z0-9]+$/
export const BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/
export const BASE64URL_REGEX = /^[\w-/]+$/
export const zBase62 = z
  .string()
  .regex(BASE62_REGEX, 'Must be a base62 string')
  .describe('Base62String')
export const zBase64 = z
  .string()
  .regex(BASE64_REGEX, 'Must be a base64 string')
  .describe('Base64String')
export const zBase64Url = z
  .string()
  .regex(BASE64URL_REGEX, 'Must be a base64url string')
  .describe('Base64UrlString')

export const JWT_REGEX = /^[\w-]+\.[\w-]+\.[\w-]+$/
export const zJwt = z.string().regex(JWT_REGEX, 'Must be a JWT string').describe('JWTString')

export const zId = z
  .string()
  .regex(/^[a-zA-Z0-9_]{6,64}$/, 'Must be an id string')
  .describe('IdString')
export const zIdBase62 = z
  .string()
  .regex(/^[a-zA-Z0-9]{8,64}$/, 'Must be a base62 id string')
  .describe('Base62Id')
export const zIdBase64 = z
  .string()
  .regex(/^[A-Za-z0-9+/]{6,62}={0,2}$/, 'Must be a base64 id string')
  .describe('Base64Id')
export const zIdBase64Url = z
  .string()
  .regex(/^[\w-/]{8,64}$/, 'Must be a base64url id string')
  .describe('Base64UrlId')

/**
 * "Slug" - a valid URL, filename, etc.
 */
export const zSlug = z
  .string()
  .regex(/^[a-z0-9-]{1,255}$/, 'Must be a slug string')
  .describe('Slug')

export const zBaseDBEntity = z
  .object({
    id: z.string(),
    // created/updated are intentionally optional here
    created: zUnixTimestamp2000.optional(),
    updated: zUnixTimestamp2000.optional(),
  })
  .describe('BaseDBEntity')

// export const zSavedDBEntity = zBaseDBEntity.required().describe('SavedDBEntity')
