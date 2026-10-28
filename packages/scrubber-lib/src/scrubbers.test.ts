import { _stringMapEntries } from '@naturalcycles/js-lib/types'
import { nanoid } from '@naturalcycles/nodejs-lib'
import { describe, expect, it } from 'vitest'
import type { BcryptStringScrubberParams } from './scrubbers.js'
import {
  bcryptStringScrubber,
  bcryptStringScrubberSQL,
  charsFromRightScrubber,
  charsFromRightScrubberSQL,
  defaultScrubbers,
  defaultScrubbersSQL,
  isoDateStringScrubber,
  isoDateStringScrubberSQL,
  keepCharsFromLeftScrubber,
  keepCharsFromLeftScrubberSQL,
  preserveOriginalScrubber,
  preserveOriginalScrubberSQL,
  randomEmailInContentScrubber,
  randomEmailInContentScrubberSQL,
  randomEmailScrubber,
  randomEmailScrubberSQL,
  randomScrubber,
  randomScrubberSQL,
  saltedHashEmailScrubber,
  saltedHashEmailScrubberSQL,
  saltedHashScrubber,
  saltedHashScrubberSQL,
  saltedHashSubstringScrubber,
  staticScrubber,
  staticScrubberSQL,
  undefinedScrubber,
  undefinedScrubberSQL,
  unixTimestampScrubber,
  unixTimestampScrubberSQL,
  zipScrubber,
  zipScrubberSQL,
} from './scrubbers.js'

const bryptStr1 = '$2a$12$HYNzBb8XYOZZeRwZDiVux.orKNqkSVAoXBDc9Gw7nSxr8rcZupbRK'
const bryptStr2 = '$2a$10$HYNzBb8XYOZZeRwZDiVux.orKNqkSVAoXBDc9Gw7nSxr8rcZupbRK'

describe('undefinedScrubber', () => {
  it('should replace any value with undefined', () => {
    expect(undefinedScrubber(true)).toBeUndefined()
    expect(undefinedScrubber(1)).toBeUndefined()
    expect(undefinedScrubber('foo')).toBeUndefined()
  })
})

it('should return NULL from undefinedScrubberSQL', () => {
  expect(undefinedScrubberSQL()).toMatchInlineSnapshot(`"NULL"`)
})

describe('preserveOriginalScrubber', () => {
  it('should return the original value', () => {
    expect(preserveOriginalScrubber(true)).toBe(true)
    expect(preserveOriginalScrubber(1)).toBe(1)
    expect(preserveOriginalScrubber('foo')).toBe('foo')
    expect(preserveOriginalScrubber(null)).toBeNull()
  })
})

it('should return VAL from preserveOriginalScrubberSQL', () => {
  expect(preserveOriginalScrubberSQL()).toMatchInlineSnapshot(`"VAL"`)
})

describe('staticScrubber', () => {
  it.each([
    [undefined, 'replacement'],
    ['', 'replacement'],
  ])('should replace the empty value "%s" with "%s"', (input, replacement) => {
    const result = staticScrubber(input, { replacement: 'replacement' })
    expect(result).toEqual(replacement)
  })

  it('should replace any string with the replacement', () => {
    const o = 'bar'

    expect(staticScrubber('', { replacement: o })).toEqual(o)
    expect(staticScrubber('foo', { replacement: o })).toEqual(o)
  })

  it('should replace a number with the replacement', () => {
    const secretNum = 666
    const r = 123

    expect(staticScrubber(secretNum, { replacement: r })).toEqual(r)
  })

  it.each([
    ['wontmatch', 'wontmatch'],
    ['could VERYWELL match', 'replacement'],
  ])('should replace only values matching ifMatch "%s" > "%s"', (input, replacement) => {
    const result = staticScrubber(input, { ifMatch: '.*V.RY.*LL.*', replacement: 'replacement' })
    expect(result).toEqual(replacement)
  })
})

it('should build staticScrubberSQL for string, number and ifMatch replacements', () => {
  expect(staticScrubberSQL({ replacement: 'hello world' })).toMatchInlineSnapshot(`"'hello world'"`)
  expect(staticScrubberSQL({ replacement: 12345 })).toMatchInlineSnapshot(`"12345"`)
  expect(staticScrubberSQL({ ifMatch: '.*V.RY.*LL.*', replacement: 12345 })).toMatchInlineSnapshot(
    `"CASE WHEN REGEXP_LIKE(VAL, '.*V.RY.*LL.*') THEN 12345 ELSE VAL END"`,
  )
})

describe('unixTimestampScrubber', () => {
  it.each([
    [undefined, undefined],
    ['', undefined],
  ])('should map the empty value "%s" to "%s"', (date, expected) => {
    const result = unixTimestampScrubber(date, { excludeDay: true })
    expect(result).toEqual(expected)
  })

  it('should zero the time of a timestamp string', () => {
    // Wednesday, July 3, 2019 9:35:21 AM to
    // Wednesday, July 3, 2019 00:00:00 AM
    const result = unixTimestampScrubber('1562146521', { excludeTime: true })
    expect(result).toBe(1562112000)
  })

  it('should zero the time of a timestamp', () => {
    // Wednesday, July 3, 2019 9:35:21 AM to
    // Wednesday, July 3, 2019 00:00:00 AM
    const result = unixTimestampScrubber(1562146521, { excludeTime: true })
    expect(result).toBe(1562112000)
  })

  it('should set the day to the 1st with excludeDay', () => {
    // Wednesday, July 3, 2019 9:35:21 AM to
    // Wednesday, July 1, 2019 9:35:21 AM
    const result = unixTimestampScrubber(1562146521, { excludeDay: true })
    expect(result).toBe(1561973721)
  })

  it('should set the date to January 1st with excludeDay and excludeMonth', () => {
    // Wednesday, July 3, 2019 9:35:21 AM to
    // Wednesday, January 1, 2019 9:35:21 AM
    const result = unixTimestampScrubber(1562146521, { excludeDay: true, excludeMonth: true })
    expect(result).toBe(1546335321)
  })

  it('should set the year to 1970 with excludeYear', () => {
    // Wednesday, July 3, 2019 9:35:21 AM to
    // Wednesday, July 3, 1970 9:35:21 AM
    const result = unixTimestampScrubber(1562146521, { excludeYear: true })
    expect(result).toBe(15845721)
  })
})

it('should build unixTimestampScrubberSQL for each exclude option', () => {
  expect(unixTimestampScrubberSQL({ excludeDay: true })).toMatchInlineSnapshot(
    `"TIMESTAMP_NTZ_FROM_PARTS(DATE_PART('YEAR', VAL), DATE_PART('MONTH', VAL), 1, DATE_PART('HOUR', VAL), DATE_PART('MINUTE', VAL), DATE_PART('SECOND', VAL))"`,
  )
  expect(unixTimestampScrubberSQL({ excludeTime: true })).toMatchInlineSnapshot(
    `"TIMESTAMP_NTZ_FROM_PARTS(DATE_PART('YEAR', VAL), DATE_PART('MONTH', VAL), DATE_PART('DAY', VAL), 0, 0, 0)"`,
  )
  expect(unixTimestampScrubberSQL({ excludeDay: true, excludeMonth: true })).toMatchInlineSnapshot(
    `"TIMESTAMP_NTZ_FROM_PARTS(DATE_PART('YEAR', VAL), 1, 1, DATE_PART('HOUR', VAL), DATE_PART('MINUTE', VAL), DATE_PART('SECOND', VAL))"`,
  )
  expect(unixTimestampScrubberSQL({ excludeYear: true })).toMatchInlineSnapshot(
    `"TIMESTAMP_NTZ_FROM_PARTS(1970, DATE_PART('MONTH', VAL), DATE_PART('DAY', VAL), DATE_PART('HOUR', VAL), DATE_PART('MINUTE', VAL), DATE_PART('SECOND', VAL))"`,
  )
})

describe('isoDateStringScrubber', () => {
  it.each([
    [undefined, undefined],
    ['', undefined],
  ])('should map the empty value "%s" to "%s"', (date, expected) => {
    const result = isoDateStringScrubber(date, { excludeDay: true })
    expect(result).toEqual(expected)
  })

  it('should set the day to 01 with excludeDay', () => {
    const result = isoDateStringScrubber('2019-05-12', { excludeDay: true })
    expect(result).toBe('2019-05-01')
  })

  it('should set the month to 01 with excludeMonth', () => {
    const result = isoDateStringScrubber('2019-05-12', { excludeMonth: true })
    expect(result).toBe('2019-01-12')
  })

  it('should set the day and month to 01 with excludeDay and excludeMonth', () => {
    const result = isoDateStringScrubber('2019-05-12', { excludeDay: true, excludeMonth: true })
    expect(result).toBe('2019-01-01')
  })

  it('should set the year to 1970 with excludeYear', () => {
    const result = isoDateStringScrubber('2019-05-12', { excludeYear: true })
    expect(result).toBe('1970-05-12')
  })

  it('should set the day to 01 and the year to 1970 with excludeDay and excludeYear', () => {
    const result = isoDateStringScrubber('2019-05-12', { excludeDay: true, excludeYear: true })
    expect(result).toBe('1970-05-01')
  })
})

it('should build isoDateStringScrubberSQL for each exclude option', () => {
  expect(isoDateStringScrubberSQL({ excludeDay: true })).toMatchInlineSnapshot(
    `"SUBSTR(VAL, 0, 8) || '01'"`,
  )
  expect(isoDateStringScrubberSQL({ excludeMonth: true })).toMatchInlineSnapshot(
    `"SUBSTR(VAL, 0, 5) || '01' || SUBSTR(VAL, 8, 10)"`,
  )
  expect(isoDateStringScrubberSQL({ excludeDay: true, excludeMonth: true })).toMatchInlineSnapshot(
    `"SUBSTR(SUBSTR(VAL, 0, 8) || '01', 0, 5) || '01' || SUBSTR(SUBSTR(VAL, 0, 8) || '01', 8, 10)"`,
  )
  expect(isoDateStringScrubberSQL({ excludeYear: true })).toMatchInlineSnapshot(
    `"'1970' || SUBSTR(VAL, 5, 10)"`,
  )
})

describe('charsFromRightScrubber', () => {
  it.each([
    [undefined, undefined],
    ['', undefined],
    ['11225', '112XX'],
    ['ABC DEF', 'ABC DXX'],
    ['ABC', 'AXX'],
    ['AB', 'XX'],
    ['A', 'X'],
  ])('should replace the last two chars with X "%s" > "%s"', (zip, expected) => {
    const result = charsFromRightScrubber(zip, { count: 2, replacement: 'X' })
    expect(result).toEqual(expected)
  })

  it('should replace every char when count exceeds the input length', () => {
    const result = charsFromRightScrubber('123', { count: 5, replacement: 'X' })
    expect(result).toBe('XXX')
  })

  it('should replace the last chars with the whole replacement when replaceFull is set', () => {
    const result = charsFromRightScrubber('blabla_123', {
      count: 3,
      replacement: '456',
      replaceFull: true,
    })
    expect(result).toBe('blabla_456')
  })
})

it('should build charsFromRightScrubberSQL with and without replaceFull', () => {
  expect(charsFromRightScrubberSQL({ count: 2, replacement: 'X' })).toMatchInlineSnapshot(
    `"SUBSTR(VAL, 0, LEN(VAL) - 2) || REPEAT('X', LEAST(2, LEN(VAL)))"`,
  )
  expect(charsFromRightScrubberSQL({ count: 5, replacement: 'X' })).toMatchInlineSnapshot(
    `"SUBSTR(VAL, 0, LEN(VAL) - 5) || REPEAT('X', LEAST(5, LEN(VAL)))"`,
  )
  expect(
    charsFromRightScrubberSQL({ count: 2, replacement: 'X', replaceFull: true }),
  ).toMatchInlineSnapshot(`"SUBSTR(VAL, 0, LEN(VAL) - 2) || 'X'"`)
})

describe('keepCharsFromLeftScrubber', () => {
  it.each([
    [undefined, undefined],
    ['', undefined],
    ['11225', '112XX'],
    ['123456789', '123XXXXXX'],
    ['ABC DEF', 'ABCXXXX'],
    ['ABC', 'ABC'],
    ['AB', 'AB'],
    ['A', 'A'],
  ])('should keep the first three chars and mask the rest with X "%s" > "%s"', (zip, expected) => {
    const result = keepCharsFromLeftScrubber(zip, { count: 3, replacement: 'X' })
    expect(result).toEqual(expected)
  })

  it('should append the whole replacement after the kept chars when replaceFull is set', () => {
    const result = keepCharsFromLeftScrubber('blabla_123', {
      count: 3,
      replacement: '456',
      replaceFull: true,
    })
    expect(result).toBe('bla456')
  })
})

it('should build keepCharsFromLeftScrubberSQL with and without replaceFull', () => {
  expect(keepCharsFromLeftScrubberSQL({ count: 2, replacement: 'X' })).toMatchInlineSnapshot(
    `"SUBSTR(VAL, 0, 2) || REPEAT('X', GREATEST(0, LEN(VAL) - 2))"`,
  )
  expect(keepCharsFromLeftScrubberSQL({ count: 5, replacement: 'X' })).toMatchInlineSnapshot(
    `"SUBSTR(VAL, 0, 5) || REPEAT('X', GREATEST(0, LEN(VAL) - 5))"`,
  )
  expect(
    keepCharsFromLeftScrubberSQL({ count: 2, replacement: 'X', replaceFull: true }),
  ).toMatchInlineSnapshot(`"IFF(LEN(VAL) > 2, SUBSTR(VAL, 0, 2) || 'X', VAL)"`)
})

describe('randomScrubber', () => {
  it('should return a value other than the input with default arguments', () => {
    const result = randomScrubber('secret')
    expect(result).not.toBe('secret')
  })

  it('should generate a string of the given length', () => {
    const result = randomScrubber('secret', { length: 5 })
    expect(result).toHaveLength(5)
  })

  it('should generate from the given alphabet and length', () => {
    const result = randomScrubber('secret', { alphabet: 'a', length: 5 })
    expect(result).toBe('aaaaa')
  })
})

it('should build randomScrubberSQL with the default and a given length', () => {
  expect(randomScrubberSQL()).toMatchInlineSnapshot(`"RANDSTR(16, HASH(RANDOM()))"`)
  expect(randomScrubberSQL({ length: 5 })).toMatchInlineSnapshot(`"RANDSTR(5, HASH(RANDOM()))"`)
})

describe('randomEmailScrubber', () => {
  it('should generate an @example.com email by default', () => {
    const result = randomEmailScrubber('secret')
    expect(result).not.toBe('secret')
    expect(result).toContain('@example.com')
  })

  it('should generate an email from the given alphabet, length and domain', () => {
    const result = randomEmailScrubber('secret', {
      alphabet: 'a',
      length: 5,
      domain: '@customdomain.com',
    })
    expect(result).toBe('aaaaa@customdomain.com')
  })
})

it('should build randomEmailScrubberSQL with the default and a given length and domain', () => {
  expect(randomEmailScrubberSQL()).toMatchInlineSnapshot(
    `"RANDSTR(16, HASH(RANDOM())) || '@example.com'"`,
  )
  expect(randomEmailScrubberSQL({ length: 5 })).toMatchInlineSnapshot(
    `"RANDSTR(5, HASH(RANDOM())) || '@example.com'"`,
  )
  expect(randomEmailScrubberSQL({ length: 5, domain: '@customdomain.com' })).toMatchInlineSnapshot(
    `"RANDSTR(5, HASH(RANDOM())) || '@customdomain.com'"`,
  )
})

describe('randomEmailInContentScrubber', () => {
  it('should leave content without an email unchanged', () => {
    const content = 'I am a string without and email in it @hello!'
    const result = randomEmailInContentScrubber(content)
    expect(result).toEqual(content)
  })

  it('should replace an email inside a URL', () => {
    const email = 'real@gmail.com'
    const prefix = '/api/user/'
    const result = randomEmailInContentScrubber(prefix + email)
    expect(result).not.toContain(email)
    expect(result).toContain(prefix)
  })

  it('should replace an email with a multi-dot domain in text', () => {
    const email = 'real_email-address.2@gmail2.com.br'
    const suffix = ', not a gmail2.com.br address'
    const text = 'This should be a random email: ' + email + suffix
    const result = randomEmailInContentScrubber(text)

    expect(result).not.toContain(email)
    expect(result).not.toContain('real')
    expect(result).not.toContain('example.com.br') // test multi.dot domains
    expect(result).toContain(suffix)
  })

  it('should replace an email with a long TLD in text', () => {
    const text = 'Foo bar baz qux@quux.corge grault'
    const result = randomEmailInContentScrubber(text)

    expect(result).not.toContain('qux@quux.corge')
    expect(result).not.toContain(' qux')
    expect(result).not.toContain('ge grault') // not matching the full email
    expect(result).toContain('Foo bar baz ')
  })

  it('should replace every email in the text, plus-addressed ones as a whole', () => {
    const text = 'From first+tag@gmail.com to second@gmail.com'
    const result = randomEmailInContentScrubber(text, { alphabet: 'a', length: 5 })
    expect(result).toBe('From aaaaa@example.com to aaaaa@example.com')
  })

  it('should replace an email containing a 0 as a whole', () => {
    const text = 'Contact jane.doe90@gmail.com today'
    const result = randomEmailInContentScrubber(text, { alphabet: 'a', length: 5 })
    expect(result).toBe('Contact aaaaa@example.com today')
  })
})

it('should build randomEmailInContentScrubberSQL with the default and a given length and domain', () => {
  expect(randomEmailInContentScrubberSQL()).toMatchInlineSnapshot(String.raw`
    "REGEXP_REPLACE(
        VAL,
        '[a-zA-Z0-9._+-]*@[a-zA-Z0-9._-]*\\.[a-zA-Z_-]{2,63}',
        RANDSTR(16, HASH(RANDOM())) || '@example.com'
      )"
  `)
  expect(randomEmailInContentScrubberSQL({ length: 5 })).toMatchInlineSnapshot(String.raw`
    "REGEXP_REPLACE(
        VAL,
        '[a-zA-Z0-9._+-]*@[a-zA-Z0-9._-]*\\.[a-zA-Z_-]{2,63}',
        RANDSTR(5, HASH(RANDOM())) || '@example.com'
      )"
  `)
  expect(randomEmailInContentScrubberSQL({ length: 5, domain: '@customdomain.com' }))
    .toMatchInlineSnapshot(String.raw`
      "REGEXP_REPLACE(
          VAL,
          '[a-zA-Z0-9._+-]*@[a-zA-Z0-9._-]*\\.[a-zA-Z_-]{2,63}',
          RANDSTR(5, HASH(RANDOM())) || '@customdomain.com'
        )"
    `)
})

describe('saltedHashScrubber', () => {
  it('should give the same hash only for the same initializationVector', () => {
    const initializationVector = nanoid()

    const result = saltedHashScrubber('secret', { initializationVector })
    expect(result).not.toBe('secret')

    const result2 = saltedHashScrubber('secret', { initializationVector })
    expect(result).toEqual(result2)

    const initializationVector2 = nanoid()
    const result3 = saltedHashScrubber('secret', { initializationVector: initializationVector2 })
    expect(result).not.toEqual(result3)
  })
})

it('should build saltedHashScrubberSQL salted with the initializationVector', () => {
  const initializationVector = 'thisIsAStaticVector'
  expect(saltedHashScrubberSQL({ initializationVector })).toMatchInlineSnapshot(
    `"SHA2(VAL || 'thisIsAStaticVector', 256)"`,
  )
})

describe('saltedHashEmailScrubber', () => {
  it('should hash with the initializationVector and append the domain', () => {
    const initializationVector = 'staticvector'

    const result = saltedHashEmailScrubber('secret', {
      initializationVector,
      domain: '@naturalcycles.com',
    })
    console.log(result)
    expect(result).not.toBe('secret')
    expect(result).toMatchSnapshot()
  })
})

it('should build saltedHashEmailScrubberSQL with the default and a given domain', () => {
  const initializationVector = 'staticvector'
  expect(saltedHashEmailScrubberSQL({ initializationVector })).toMatchInlineSnapshot(
    `"SHA2(VAL || 'staticvector', 256) || '@example.com'"`,
  )
  expect(
    saltedHashEmailScrubberSQL({ initializationVector, domain: '@naturalcycles.com' }),
  ).toMatchInlineSnapshot(`"SHA2(VAL || 'staticvector', 256) || '@naturalcycles.com'"`)
})

describe('bcryptStringScrubber', () => {
  it('should keep the algorithm, cost factor and length of a bcrypt string', () => {
    const result = bcryptStringScrubber(bryptStr1)
    expect(result).not.toEqual(bryptStr1)
    expect(result!.slice(0, 7)).toBe('$2a$12$')
    expect(result!).toHaveLength(bryptStr1.length)
  })

  it('should keep a lower cost factor', () => {
    const result = bcryptStringScrubber(bryptStr2)
    expect(result).not.toEqual(bryptStr2)
    expect(result!.slice(0, 7)).toBe('$2a$10$')
  })
  it('should return undefined and empty input unchanged', () => {
    const undefinedResult = bcryptStringScrubber(undefined)
    expect(undefinedResult).toBeUndefined()

    const emptyResult = bcryptStringScrubber('')
    expect(emptyResult).toBe('')
  })
  it('should return a $2a$12$ bcrypt string for an invalid input', () => {
    const result = bcryptStringScrubber('stringWithToFew$')
    expect(result!.slice(0, 7)).toBe('$2a$12$')
    expect(result!).toHaveLength(bryptStr1.length)
  })
  it('should return the replacement mapped to the prefix of the input', () => {
    const params: BcryptStringScrubberParams = {
      replacements: '$2a$10$:$2a$10$456,$2a$12$:$2a$12$123',
    }
    const result = bcryptStringScrubber(bryptStr1, params)
    expect(result).toBe('$2a$12$123')

    const result2 = bcryptStringScrubber(bryptStr2, params)
    expect(result2).toBe('$2a$10$456')
  })
})

it('should build bcryptStringScrubberSQL with and without replacements', () => {
  expect(bcryptStringScrubberSQL()).toMatchSnapshot()
  expect(
    bcryptStringScrubberSQL({ replacements: '$2a$10$:$2a$10$456,$2a$12$:$2a$12$123' }),
  ).toMatchSnapshot()
})

describe('saltedHashSubstringScrubber', () => {
  const initializationVector = nanoid()

  it('should scrub the matching substring with a hash', () => {
    const result = saltedHashSubstringScrubber('foo|00:00:00:00:00:00|bar', {
      regex: '00:00:00:00:00:00',
      initializationVector,
    })

    expect(result).toMatch(/foo\|.{64}\|bar/)
    expect(result).not.toContain('00:00:00:00:00:00')
  })

  it('should scrub the same value with the same hash', () => {
    const result1 = saltedHashSubstringScrubber('foo|00:00:00:00:00:00|bar', {
      regex: '00:00:00:00:00:00',
      initializationVector,
    })

    const result2 = saltedHashSubstringScrubber('bee|00:00:00:00:00:00|boo', {
      regex: '00:00:00:00:00:00',
      initializationVector,
    })

    expect(result1?.slice(4, 64)).toBe(result2?.slice(4, 64))
  })

  it('should scrub substring using regex', () => {
    const result = saltedHashSubstringScrubber('foo|00:00:00:00:00:00|bar', {
      regex:
        '[0-9a-zA-Z]{2}:[0-9a-zA-Z]{2}:[0-9a-zA-Z]{2}:[0-9a-zA-Z]{2}:[0-9a-zA-Z]{2}:[0-9a-zA-Z]{2}',
      initializationVector,
    })

    expect(result).toMatch(/foo\|.{64}\|bar/)
    expect(result).not.toContain('00:00:00:00:00:00')
  })

  it('should scrub multiple occurrences', () => {
    const result = saltedHashSubstringScrubber('foo|max|bar|max|boo', {
      regex: 'max',
      initializationVector,
    })

    expect(result).not.toContain('max')
  })

  it('should throw when the salt is missing', () => {
    expect(() => saltedHashSubstringScrubber('foo|max|bar', { regex: 'max' } as any)).toThrow(
      'Initialization vector is missing',
    )
  })

  it('should throw when the regex or substring is missing', () => {
    expect(() =>
      saltedHashSubstringScrubber('foo|max|bar', {
        initializationVector,
      } as any),
    ).toThrow('Substring or regex is missing')
  })
})

describe('zipScrubber', () => {
  it.each([
    [undefined, undefined],
    ['', undefined],
    ['11225', '112XX'],
    ['123456789', '123XX'],
    ['ABC DEF', 'ABCXX'],
    ['ABC', 'ABCXX'],
    ['AB', 'ABXX'],
    ['A', 'AXX'],
    ['878123', 'XXXXX'],
  ])('should anonymize the zip code "%s" as "%s"', (zip, expected) => {
    const result = zipScrubber(zip)
    expect(result).toEqual(expected)
  })
})

it('should build zipScrubberSQL that fully masks restricted prefixes', () => {
  expect(zipScrubberSQL()).toMatchInlineSnapshot(
    `
    "CASE WHEN ARRAY_CONTAINS(
                   SUBSTR(VAL, 0, 3),
                   ['036', '059', '063', '102', '203', '556', '692', '790', '821', '823', '830', '831', '878', '879', '884', '890', '893']::ARRAY(STRING)
                 )
         THEN 'XXXXX'
         ELSE SUBSTR(VAL, 0, 3) || 'XX'
       END"
  `,
  )
})

const scrubberNames = _stringMapEntries(defaultScrubbers).map(([k]) => k)
it.each(scrubberNames)('should have an SQL scrubber for %s', scrubberName => {
  console.log(scrubberName, defaultScrubbersSQL[scrubberName])
  expect(defaultScrubbersSQL[scrubberName]).toBeDefined()
})

const sqlScrubberNames = _stringMapEntries(defaultScrubbersSQL).map(([k]) => k)
it.each(sqlScrubberNames)('should have a scrubber for the SQL scrubber %s', scrubberName => {
  expect(defaultScrubbers[scrubberName]).toBeDefined()
})
