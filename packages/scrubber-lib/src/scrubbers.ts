import crypto from 'node:crypto'
import { _assert } from '@naturalcycles/js-lib/error'
import { nanoIdCustomAlphabet } from '@naturalcycles/nodejs-lib'
import type { ScrubberFn, ScrubbersMap, ScrubberSQLFn, ScrubbersSQLMap } from './scrubber.model.js'

function encloseValueForSQL(value: string | number, type: string): string {
  if (type === 'STRING') return `'${value}'`
  return String(value)
}

// The name of the original value in the SQL statement
const sqlValueToReplace = 'VAL'

// Seed for all random functions. If `HASH(${sqlValueToReplace})` is used,
// the random value will be the same every time the table is queried
// With `HASH(RANDOM())`, the random value will be different every time, but is safer cryptographically
const randomGeneratorSeed = `HASH(RANDOM())`
/*
 Undefined scrubber

 Replace value with `undefined`
 */
export type UndefinedScrubberFn = ScrubberFn<any, undefined>

export type UndefinedScrubberSQLFn = ScrubberSQLFn<undefined>

export const undefinedScrubber: UndefinedScrubberFn = () => undefined

export const undefinedScrubberSQL: UndefinedScrubberSQLFn = () => 'NULL'

/*
 Preserve original scrubber

 Useful for profiles that inherit from another and want to keep original value
 (eg: "removing" scrubber from parent)
 */
export type PreserveOriginalScrubberFn = ScrubberFn<any, undefined>

export type PreserveOriginalScrubberSQLFn = ScrubberSQLFn<undefined>

export const preserveOriginalScrubber: PreserveOriginalScrubberFn = value => value

export const preserveOriginalScrubberSQL: PreserveOriginalScrubberSQLFn = () => sqlValueToReplace

/*
 Static scrubber

 Replace value with `params.replacement`
 */
export interface StaticScrubberParams {
  /**
   * Only scrub if value matches given Regex
   */
  ifMatch?: string
  replacement: string | number
}
export type StaticScrubberFn = ScrubberFn<any, StaticScrubberParams>

export type StaticScrubberSQLFn = ScrubberSQLFn<StaticScrubberParams>

export const staticScrubber: StaticScrubberFn = (value, params = { replacement: '' }) =>
  (params.ifMatch && !value.match(params.ifMatch) && value) || params.replacement

export const staticScrubberSQL: StaticScrubberSQLFn = (params = { replacement: '' }) => {
  const { ifMatch, replacement } = params
  const type = typeof replacement === 'number' ? 'NUMBER' : 'STRING'

  return wrapIfMatchSQL(ifMatch, encloseValueForSQL(replacement, type))
}
/*
 ISO Date string scrubber

 excludeDay: 2019-05-25 -> 2019-05-01
 excludeMonth: 2019-05-25 -> 2019-01-25
 excludeYear: 2019-05-25 -> 1970-05-25
 */
export interface ISODateStringScrubberParams {
  excludeDay?: boolean
  excludeMonth?: boolean
  excludeYear?: boolean
}
export type ISODateStringScrubberFn = ScrubberFn<string | undefined, ISODateStringScrubberParams>

export type ISODateStringScrubberSQLFn = ScrubberSQLFn<ISODateStringScrubberParams>

export const isoDateStringScrubber: ISODateStringScrubberFn = (value, params = {}) => {
  if (!value) return

  if (value && params.excludeDay) {
    value = value.slice(0, 8) + '01'
  }

  if (value && params.excludeMonth) {
    value = value.slice(0, 5) + '01' + value.substr(7, 3)
  }

  if (value && params.excludeYear) {
    value = '1970' + value.substr(4, 9)
  }

  return value
}

export const isoDateStringScrubberSQL: ISODateStringScrubberSQLFn = (params = {}) => {
  let replacement = sqlValueToReplace

  if (params.excludeDay) {
    replacement = `SUBSTR(${replacement}, 0, 8) || '01'`
  }
  if (params.excludeMonth) {
    replacement = `SUBSTR(${replacement}, 0, 5) || '01' || SUBSTR(${replacement}, 8, 10)`
  }
  if (params.excludeYear) {
    replacement = `'1970' || SUBSTR(${replacement}, 5, 10)`
  }

  return replacement // "SUBSTR(VAL, 0, 8) || '01'"
}

/*
 Unix timestamp (timestamp in seconds) scrubber
 */
export interface UnixTimestampScrubberParams {
  excludeTime?: boolean
  excludeDay?: boolean
  excludeMonth?: boolean
  excludeYear?: boolean
}
export type UnixTimestampScrubberFn = ScrubberFn<
  number | string | undefined,
  UnixTimestampScrubberParams
>
export type UnixTimestampScrubberSQLFn = ScrubberSQLFn<UnixTimestampScrubberParams>

export const unixTimestampScrubber: UnixTimestampScrubberFn = (value, params = {}) => {
  if (!value) return

  const date = new Date((value as number) * 1000)

  if (value && params.excludeTime) {
    date.setSeconds(0)
    date.setMinutes(0)
    date.setHours(0)
  }

  if (value && params.excludeDay) {
    date.setDate(1)
  }

  if (value && params.excludeMonth) {
    date.setMonth(0)
  }

  if (value && params.excludeYear) {
    date.setFullYear(1970)
  }

  return Math.round(date.getTime() / 1000)
}

export const unixTimestampScrubberSQL: UnixTimestampScrubberSQLFn = (params = {}) => {
  let replacement = 'TIMESTAMP_NTZ_FROM_PARTS('

  if (params.excludeYear) {
    replacement += '1970, '
  } else {
    replacement += `DATE_PART('YEAR', ${sqlValueToReplace}), `
  }

  if (params.excludeMonth) {
    replacement += '1, '
  } else {
    replacement += `DATE_PART('MONTH', ${sqlValueToReplace}), `
  }

  if (params.excludeDay) {
    replacement += '1, '
  } else {
    replacement += `DATE_PART('DAY', ${sqlValueToReplace}), `
  }

  if (params.excludeTime) {
    replacement += '0, 0, 0)'
  } else {
    replacement += `DATE_PART('HOUR', ${sqlValueToReplace}), DATE_PART('MINUTE', ${sqlValueToReplace}), DATE_PART('SECOND', ${sqlValueToReplace}))`
  }

  return replacement
}

/*
  Chars From Right scrubber

  Replace `params.count` characters, from the right to the left, with `params.replacement`
  Useful for anonymizing zip codes
 */
export interface CharsFromRightScrubberParams {
  count: number
  replacement: string
  /**
   * Should replacement be for "full" replacement? default is false, each replaced char will be replaced with replacement.
   */
  replaceFull?: boolean
}
export type CharsFromRightScrubberFn = ScrubberFn<string | undefined, CharsFromRightScrubberParams>

export type CharsFromRightScrubberSQLFn = ScrubberSQLFn<CharsFromRightScrubberParams>

export const charsFromRightScrubber: CharsFromRightScrubberFn = (
  value,
  params = { count: 99, replacement: 'X', replaceFull: false },
) => {
  if (!value) return

  const { count, replacement, replaceFull } = params

  if (replaceFull) {
    return value.substr(0, value.length - count) + replacement
  }
  const lengthToReplace = Math.min(count, value.length)
  return value.substr(0, value.length - count) + replacement.repeat(lengthToReplace)
}

export const charsFromRightScrubberSQL: CharsFromRightScrubberSQLFn = (
  params = { count: 99, replacement: 'X', replaceFull: false },
) => {
  const { count, replacement, replaceFull } = params

  if (replaceFull) {
    // remove $count chars from the right, and replace it by $replacement
    return `SUBSTR(${sqlValueToReplace}, 0, LEN(${sqlValueToReplace}) - ${count}) || '${replacement}'`
  }
  // replace each chars from the right by $replacement until $count chars are replaced
  return `SUBSTR(${sqlValueToReplace}, 0, LEN(${sqlValueToReplace}) - ${count}) || REPEAT('${replacement}', LEAST(${count}, LEN(${sqlValueToReplace})))`
}

/*
  Keep Chars From Left scrubber

  Keep `params.count` characters from the left and replace the rest with  `params.replacement`
  Useful for anonymizing zip codes
 */
export interface KeepCharsFromLeftScrubberParams {
  count: number
  replacement: string
  /**
   * Should replacement be for "full" replacement? default is false, each replaced char will be replaced with replacement.
   */
  replaceFull?: boolean
}
export type KeepCharsFromLeftScrubberFn = ScrubberFn<
  string | undefined,
  KeepCharsFromLeftScrubberParams
>

export type KeepCharsFromLeftScrubberSQLFn = ScrubberSQLFn<KeepCharsFromLeftScrubberParams>

export const keepCharsFromLeftScrubber: KeepCharsFromLeftScrubberFn = (
  value,
  params = { count: 99, replacement: 'X', replaceFull: false },
) => {
  if (!value) return

  const { count, replacement, replaceFull } = params

  if (value.length <= count) {
    return value
  }
  if (replaceFull) {
    return value.slice(0, count) + replacement
  }
  return value.slice(0, count) + replacement.repeat(value.length - count)
}

export const keepCharsFromLeftScrubberSQL: KeepCharsFromLeftScrubberSQLFn = (
  params = { count: 99, replacement: 'X', replaceFull: false },
) => {
  const { count, replacement, replaceFull } = params

  if (replaceFull) {
    // keep $count chars from the left, and replace rest by $replacement
    return `IFF(LEN(${sqlValueToReplace}) > ${count}, SUBSTR(${sqlValueToReplace}, 0, ${count}) || '${replacement}', ${sqlValueToReplace})`
  }
  // keep $count chars and fill out with $replacement if string was longer
  return `SUBSTR(${sqlValueToReplace}, 0, ${count}) || REPEAT('${replacement}', LEAST(0, LEN(${sqlValueToReplace})-${count})`
}

/*
  Random scrubber

  Uses the package nanoid to generate a random string given an alphabet and a length
 */
const ALPHABET_NUMBER = '0123456789'
const ALPHABET_LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const ALPHABET_ALPHANUMERIC_LOWERCASE = [ALPHABET_NUMBER, ALPHABET_LOWERCASE].join('')

export interface RandomScrubberParams {
  alphabet?: string
  length?: number
}

export type RandomScrubberFn = ScrubberFn<string, RandomScrubberParams>

export type RandomScrubberSQLFn = ScrubberSQLFn<RandomScrubberParams>

export const randomScrubber: RandomScrubberFn = (_value, additionalParams) => {
  const params = { alphabet: ALPHABET_ALPHANUMERIC_LOWERCASE, length: 16, ...additionalParams }
  return nanoIdCustomAlphabet(params.alphabet, params['length'])()
}

export const randomScrubberSQL: RandomScrubberSQLFn = additionalParams => {
  const { length } = { length: 16, ...additionalParams }
  // This doesn't respect the alphabet :(
  return `RANDSTR(${length}, ${randomGeneratorSeed})`
}

/*
  Random email scrubber

  Uses the package nanoid to generate a random string given an alphabet and a length
  and appends a given domain (should include '@') at the end of it
 */
export interface RandomEmailScrubberParams {
  alphabet?: string
  length?: number
  domain?: string
}

export type RandomEmailScrubberFn = ScrubberFn<string, RandomEmailScrubberParams>

export type RandomEmailScrubberSQLFn = ScrubberSQLFn<RandomEmailScrubberParams>

export const randomEmailScrubber: RandomEmailScrubberFn = (_value, additionalParams) => {
  const params = {
    alphabet: ALPHABET_ALPHANUMERIC_LOWERCASE,
    length: 16,
    domain: '@example.com',
    ...additionalParams,
  }
  return nanoIdCustomAlphabet(params.alphabet, params['length'])() + params.domain
}

export const randomEmailScrubberSQL: RandomEmailScrubberSQLFn = additionalParams => {
  const { length, domain } = {
    // alphabet: ALPHABET_ALPHANUMERIC_LOWERCASE,
    length: 16,
    domain: '@example.com',
    ...additionalParams,
  }
  // This doesn't respect the alphabet :(
  return `RANDSTR(${length}, ${randomGeneratorSeed}) || '${domain}'`
}

/*
  Random email in content scrubber

  Extends the random email scrubber and allows scrubbing emails within strings while maintaining the rest of the string
 */
export interface RandomEmailInContentScrubberParams {
  alphabet?: string
  length?: number
  domain?: string
}

export type RandomEmailInContentScrubberFn = ScrubberFn<string, RandomEmailInContentScrubberParams>

export type RandomEmailInContentScrubberSQLFn = ScrubberSQLFn<RandomEmailInContentScrubberParams>

export const randomEmailInContentScrubber: RandomEmailInContentScrubberFn = (
  value,
  additionalParams,
) => {
  // Email regex, allows letters
  const emailRegex = /([a-zA-Z1-9._-]*@[a-zA-Z1-9._-]*\.[a-zA-Z_-]{2,63})/
  const matches = emailRegex.exec(value)
  if (!matches) {
    // No email found, return as is
    return value
  }
  // Replace all matches with random email
  const match = matches.pop()!
  value = value.replace(match, randomEmailScrubber(value, additionalParams))

  return value
}

export const randomEmailInContentScrubberSQL: RandomEmailInContentScrubberSQLFn =
  additionalParams => {
    const { length, domain } = {
      // alphabet: ALPHABET_ALPHANUMERIC_LOWERCASE,
      length: 16,
      domain: '@example.com',
      ...additionalParams,
    }
    return `REGEXP_REPLACE(
    ${sqlValueToReplace},
    '[a-zA-Z1-9._-]*@[a-zA-Z1-9._-]*\\.[a-zA-Z_-]{2,63}',
    RANDSTR(${length}, ${randomGeneratorSeed})
  ) || '${domain}'`
  }

/*
  Salted hash scrubber.

  Takes an initializationVector param and uses it to salt the value before hashing it.
 */
export interface SaltedHashScrubberParams {
  initializationVector: string
}

export type SaltedHashScrubberFn = ScrubberFn<string, SaltedHashScrubberParams>

export type SaltedHashScrubberSQLFn = ScrubberSQLFn<SaltedHashScrubberParams>

export const saltedHashScrubber: SaltedHashScrubberFn = (value, params) => {
  _assert(params?.initializationVector, 'Initialization vector is missing')

  return crypto.createHash('sha256').update(value).update(params.initializationVector).digest('hex')
}

export const saltedHashScrubberSQL: SaltedHashScrubberSQLFn = params => {
  _assert(params?.initializationVector, 'Initialization vector is missing')
  return `SHA2(${sqlValueToReplace} || '${params.initializationVector}', 256)`
}

/*
  Salted hash email scrubber.

  Takes an initializationVector param and uses it to salt the value before hashing it and suffixing email domain
 */
export interface SaltedHashEmailScrubberParams {
  initializationVector: string
  domain?: string
}

export type SaltedHashEmailScrubberFn = ScrubberFn<string, SaltedHashEmailScrubberParams>

export type SaltedHashEmailScrubberSQLFn = ScrubberSQLFn<SaltedHashEmailScrubberParams>

export const saltedHashEmailScrubber: SaltedHashEmailScrubberFn = (value, additionalParams) => {
  const params = {
    domain: '@example.com',
    ...additionalParams,
  } as SaltedHashEmailScrubberParams

  _assert(params?.initializationVector, 'Initialization vector is missing')

  return saltedHashScrubber(value, params) + params.domain
}

export const saltedHashEmailScrubberSQL: SaltedHashEmailScrubberSQLFn = additionalParams => {
  const { initializationVector, domain } = {
    domain: '@example.com',
    ...additionalParams,
  } as SaltedHashEmailScrubberParams

  _assert(initializationVector, 'Initialization vector is missing')

  return `SHA2(${sqlValueToReplace} || '${initializationVector}', 256) || '${domain}'`
}

/*
 Bcrypt string scrubber. Scrubs both salt and hash while maintaining algo and cost factor, thus resulting in a valid,
 but nonsense bcrypt string

 */
export type BcryptStringScrubberFn = ScrubberFn<string | undefined, BcryptStringScrubberParams>

export type BcryptStringScrubberSQLFn = ScrubberSQLFn<BcryptStringScrubberParams>

/*
 replacements string is a comma seperated list of key-value pairs (seperated by :) that maps bcrypt string prefix
 (algo + cost factor) to a resulting string replacement.

 e.g. replacements: '$2a$10$:$2a$10$456,$2a$12$:$2a$12$123'
 */
export interface BcryptStringScrubberParams {
  replacements: string
}

export const bcryptStringScrubber: BcryptStringScrubberFn = (value, params) => {
  if (!value) return value

  // Keep value until 3rd $
  const cutoff = nthChar(value, '$', 3)
  if (!cutoff) return `$2a$12$${nanoIdCustomAlphabet(ALPHABET_ALPHANUMERIC_LOWERCASE, 53)()}`

  const prefix = value.substring(0, cutoff)

  if (params?.replacements) {
    for (const kvPair of params.replacements.split(',')) {
      const [k, v] = kvPair.split(':')
      if (prefix === k) return v
    }
  }

  return `${prefix}${nanoIdCustomAlphabet(ALPHABET_ALPHANUMERIC_LOWERCASE, 53)()}`
}
export const bcryptStringScrubberSQL: BcryptStringScrubberSQLFn = params => {
  // to have at least one WHEN clause, so the ELSE clause is valid
  let replacementDLL = "WHEN FALSE THEN ''\n                  "
  // unpack the replacements here rather than in SQL
  if (params?.replacements) {
    for (const kvPair of params.replacements.split(',')) {
      const [k, v] = kvPair.split(':')
      replacementDLL += `WHEN '${k}' THEN '${v}'\n                  `
    }
  }
  replacementDLL += `ELSE ARRAY_TO_STRING(ARRAY_SLICE(SPLIT(${sqlValueToReplace}, '$'), 0, 3), '$') || '$' || RANDSTR(53, ${randomGeneratorSeed})`

  return `CASE WHEN ARRAY_SIZE(ARRAY_SLICE(SPLIT(${sqlValueToReplace}, '$'), 0, 3)) >= 3 -- If there are at least 3 $ in the string
          THEN
              CASE ARRAY_TO_STRING(ARRAY_SLICE(SPLIT(${sqlValueToReplace}, '$'), 0, 3), '$') || '$' -- this is the prefix
                  ${replacementDLL}
              END
          ELSE '$2a$12$' || RANDSTR(53, ${randomGeneratorSeed})
          END`
}

export type SaltedHashSubstringScrubberFn = ScrubberFn<
  string | undefined,
  SaltedHashSubstringScrubberParams
>

export type SaltedHashSubstringScrubberSQLFn = ScrubberSQLFn<SaltedHashSubstringScrubberParams>

export interface SaltedHashSubstringScrubberParams {
  initializationVector: string
  regex: string
}

export const saltedHashSubstringScrubber: SaltedHashSubstringScrubberFn = (value, params) => {
  _assert(params?.initializationVector, 'Initialization vector is missing')
  _assert(params?.regex, 'Substring or regex is missing')

  if (!value) return value

  const regex = new RegExp(params.regex, 'g')

  return value.replace(regex, substring =>
    crypto.createHash('sha256').update(substring).update(params.initializationVector).digest('hex'),
  )
}

export const saltedHashSubstringScrubberSQL: SaltedHashSubstringScrubberSQLFn = params => {
  _assert(params?.initializationVector, 'Initialization vector is missing')
  _assert(params?.regex, 'Substring or regex is missing')

  const substringToReplace = `COALESCE(REGEXP_SUBSTR(${sqlValueToReplace}, '${params.regex}'), '')`
  const hashedValue = `SHA2(${substringToReplace} || '${params.initializationVector}', 256)`
  const replacedValue = `REGEXP_REPLACE(${sqlValueToReplace}, '${params.regex}', ${hashedValue})`

  return replacedValue
}

/*
 A scrubber based on USA recommendations from HIPAA
 https://www.hhs.gov/hipaa/for-professionals/special-topics/de-identification/index.html#standard
 */
export type ZipScrubberFn = ScrubberFn<string | undefined, undefined>

/**
 * ZIP areas to scrub completely, due to less than 20,000 inhabitants
 */
const restrictedZipAreas = [
  '036',
  '059',
  '063',
  '102',
  '203',
  '556',
  '692',
  '790',
  '821',
  '823',
  '830',
  '831',
  '878',
  '879',
  '884',
  '890',
  '893',
]

export type ZipScrubberSQLFn = ScrubberSQLFn<undefined>

export const zipScrubber: ZipScrubberFn = value => {
  if (!value) return

  const leftPart = value.slice(0, 3)
  if (restrictedZipAreas.includes(leftPart)) return 'XXXXX'
  return `${leftPart}XX` // de-identify length of zip code as well.
}

export const zipScrubberSQL: ZipScrubberSQLFn = () =>
  `CASE WHEN ARRAY_CONTAINS(
               SUBSTR(${sqlValueToReplace}, 0, 3),
               ['${restrictedZipAreas.join("', '")}']::ARRAY(STRING)
             )
     THEN 'XXXXX'
     ELSE SUBSTR(${sqlValueToReplace}, 0, 3) || 'XX'
   END`

function nthChar(str: string, character: string, n: number): number | undefined {
  let count = 0
  let i = 0
  while (count < n) {
    i = str.indexOf(character, i) + 1
    if (i < 1) {
      return
    }
    count++

    if (count === n) return i
  }
}

export const defaultScrubbers: ScrubbersMap = {
  staticScrubber,
  preserveOriginalScrubber,
  isoDateStringScrubber,
  unixTimestampScrubber,
  undefinedScrubber,
  charsFromRightScrubber,
  randomScrubber,
  randomEmailScrubber,
  randomEmailInContentScrubber,
  saltedHashScrubber,
  saltedHashEmailScrubber,
  bcryptStringScrubber,
  saltedHashSubstringScrubber,
  keepCharsFromLeftScrubber,
  zipScrubber,
}

export const defaultScrubbersSQL: ScrubbersSQLMap = {
  staticScrubber: staticScrubberSQL,
  preserveOriginalScrubber: preserveOriginalScrubberSQL,
  isoDateStringScrubber: isoDateStringScrubberSQL,
  unixTimestampScrubber: unixTimestampScrubberSQL,
  undefinedScrubber: undefinedScrubberSQL,
  charsFromRightScrubber: charsFromRightScrubberSQL,
  randomScrubber: randomScrubberSQL,
  randomEmailScrubber: randomEmailScrubberSQL,
  randomEmailInContentScrubber: randomEmailInContentScrubberSQL,
  saltedHashScrubber: saltedHashScrubberSQL,
  saltedHashEmailScrubber: saltedHashEmailScrubberSQL,
  bcryptStringScrubber: bcryptStringScrubberSQL,
  saltedHashSubstringScrubber: saltedHashSubstringScrubberSQL,
  keepCharsFromLeftScrubber: keepCharsFromLeftScrubberSQL,
  zipScrubber: zipScrubberSQL,
}

const wrapIfMatchSQL = (ifMatch: string | undefined, expression: string): string => {
  if (ifMatch === undefined) return expression
  return `CASE WHEN REGEXP_LIKE(${sqlValueToReplace}, '${ifMatch}') THEN ${expression} ELSE ${sqlValueToReplace} END`
}
