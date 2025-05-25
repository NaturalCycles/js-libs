import { _stringMapEntries } from '@naturalcycles/js-lib'
import { nanoid } from '@naturalcycles/nodejs-lib'
import { describe, expect, test } from 'vitest'
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
  test('replaces any value with undefined', () => {
    expect(undefinedScrubber(true)).toBeUndefined()
    expect(undefinedScrubber(1)).toBeUndefined()
    expect(undefinedScrubber('foo')).toBeUndefined()
  })
})

test('undefinedScrubberSQL', () => {
  expect(undefinedScrubberSQL()).toMatchInlineSnapshot(`"NULL"`)
})

describe('preserveOriginalScrubber', () => {
  test('preserves the original value', () => {
    expect(preserveOriginalScrubber(true)).toBe(true)
    expect(preserveOriginalScrubber(1)).toBe(1)
    expect(preserveOriginalScrubber('foo')).toBe('foo')
    expect(preserveOriginalScrubber(null)).toBeNull()
  })
})

test('preserveOriginalScrubberSQL', () => {
  expect(preserveOriginalScrubberSQL()).toMatchInlineSnapshot(`"VAL"`)
})

describe('staticScrubber', () => {
  test.each([
    [undefined, 'replacement'],
    ['', 'replacement'],
  ])('handles undefined values "%s" > "%s"', (input, replacement) => {
    const result = staticScrubber(input, { replacement: 'replacement' })
    expect(result).toEqual(replacement)
  })

  test('replaces any string with replacement', () => {
    const o = 'bar'

    expect(staticScrubber('', { replacement: o })).toEqual(o)
    expect(staticScrubber('foo', { replacement: o })).toEqual(o)
  })

  test('replace number', () => {
    const secretNum = 666
    const r = 123

    expect(staticScrubber(secretNum, { replacement: r })).toEqual(r)
  })

  test.each([
    ['wontmatch', 'wontmatch'],
    ['could VERYWELL match', 'replacement'],
  ])('replaces only ifMatch matches "%s" > "%s"', (input, replacement) => {
    const result = staticScrubber(input, { ifMatch: '.*V.RY.*LL.*', replacement: 'replacement' })
    expect(result).toEqual(replacement)
  })
})

test('staticScrubberSQL', () => {
  expect(staticScrubberSQL({ replacement: 'hello world' })).toMatchInlineSnapshot(`"'hello world'"`)
  expect(staticScrubberSQL({ replacement: 12345 })).toMatchInlineSnapshot(`"12345"`)
  expect(staticScrubberSQL({ ifMatch: '.*V.RY.*LL.*', replacement: 12345 })).toMatchInlineSnapshot(
    `"CASE WHEN REGEXP_LIKE(VAL, '.*V.RY.*LL.*') THEN 12345 ELSE VAL END"`,
  )
})

describe('unixTimestampScrubber', () => {
  test.each([
    [undefined, undefined],
    ['', undefined],
  ])('handles undefined values "%s" > "%s"', (date, expected) => {
    const result = unixTimestampScrubber(date, { excludeDay: true })
    expect(result).toEqual(expected)
  })

  test('scrubs only time (string)', () => {
    // Wednesday, July 3, 2019 9:35:21 AM to
    // Wednesday, July 3, 2019 00:00:00 AM
    const result = unixTimestampScrubber('1562146521', { excludeTime: true })
    expect(result).toBe(1562112000)
  })

  test('scrubs only time', () => {
    // Wednesday, July 3, 2019 9:35:21 AM to
    // Wednesday, July 3, 2019 00:00:00 AM
    const result = unixTimestampScrubber(1562146521, { excludeTime: true })
    expect(result).toBe(1562112000)
  })

  test('scrubs only day', () => {
    // Wednesday, July 3, 2019 9:35:21 AM to
    // Wednesday, July 1, 2019 9:35:21 AM
    const result = unixTimestampScrubber(1562146521, { excludeDay: true })
    expect(result).toBe(1561973721)
  })

  test('scrubs day and month', () => {
    // Wednesday, July 3, 2019 9:35:21 AM to
    // Wednesday, January 1, 2019 9:35:21 AM
    const result = unixTimestampScrubber(1562146521, { excludeDay: true, excludeMonth: true })
    expect(result).toBe(1546335321)
  })

  test('scrubs only year', () => {
    // Wednesday, July 3, 2019 9:35:21 AM to
    // Wednesday, July 3, 1970 9:35:21 AM
    const result = unixTimestampScrubber(1562146521, { excludeYear: true })
    expect(result).toBe(15845721)
  })
})

test('unixTimestampScrubberSQL', () => {
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
  test.each([
    [undefined, undefined],
    ['', undefined],
  ])('handles undefined values "%s" > "%s"', (date, expected) => {
    const result = isoDateStringScrubber(date, { excludeDay: true })
    expect(result).toEqual(expected)
  })

  test('scrubs only day', () => {
    const result = isoDateStringScrubber('2019-05-12', { excludeDay: true })
    expect(result).toBe('2019-05-01')
  })

  test('scrubs only month', () => {
    const result = isoDateStringScrubber('2019-05-12', { excludeMonth: true })
    expect(result).toBe('2019-01-12')
  })

  test('scrubs both day and month', () => {
    const result = isoDateStringScrubber('2019-05-12', { excludeDay: true, excludeMonth: true })
    expect(result).toBe('2019-01-01')
  })

  test('scrubs only year', () => {
    const result = isoDateStringScrubber('2019-05-12', { excludeYear: true })
    expect(result).toBe('1970-05-12')
  })

  test('scrubs both day and year', () => {
    const result = isoDateStringScrubber('2019-05-12', { excludeDay: true, excludeYear: true })
    expect(result).toBe('1970-05-01')
  })
})

test('isoDateStringScrubberSQL', () => {
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
  test.each([
    [undefined, undefined],
    ['', undefined],
    ['11225', '112XX'],
    ['ABC DEF', 'ABC DXX'],
    ['ABC', 'AXX'],
    ['AB', 'XX'],
    ['A', 'X'],
  ])('anonymizes zip codes "%s" > "%s"', (zip, expected) => {
    const result = charsFromRightScrubber(zip, { count: 2, replacement: 'X' })
    expect(result).toEqual(expected)
  })

  test('removes 2 chars', () => {
    const result = charsFromRightScrubber('76543', { count: 2, replacement: 'X' })
    expect(result).toBe('765XX')
  })

  test('does not fail/crash if count > input length', () => {
    const result = charsFromRightScrubber('123', { count: 5, replacement: 'X' })
    expect(result).toBe('XXX')
  })

  test('charsFromRightScrubber - Full replacement', () => {
    const result = charsFromRightScrubber('blabla_123', {
      count: 3,
      replacement: '456',
      replaceFull: true,
    })
    expect(result).toBe('blabla_456')
  })
})

test('charsFromRightScrubberSQL', () => {
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
  test.each([
    [undefined, undefined],
    ['', undefined],
    ['11225', '112XX'],
    ['123456789', '123XXXXXX'],
    ['ABC DEF', 'ABCXXXX'],
    ['ABC', 'ABC'],
    ['AB', 'AB'],
    ['A', 'A'],
  ])('anonymizes zip codes "%s" > "%s"', (zip, expected) => {
    const result = keepCharsFromLeftScrubber(zip, { count: 3, replacement: 'X' })
    expect(result).toEqual(expected)
  })

  test('keeps 3 chars', () => {
    const result = keepCharsFromLeftScrubber('76543', { count: 3, replacement: 'X' })
    expect(result).toBe('765XX')
  })

  test('keepCharsFromLeftScrubber - Full replacement', () => {
    const result = keepCharsFromLeftScrubber('blabla_123', {
      count: 3,
      replacement: '456',
      replaceFull: true,
    })
    expect(result).toBe('bla456')
  })
})

test('keepCharsFromLeftScrubberSQL', () => {
  expect(keepCharsFromLeftScrubberSQL({ count: 2, replacement: 'X' })).toMatchInlineSnapshot(
    `"SUBSTR(VAL, 0, 2) || REPEAT('X', LEAST(0, LEN(VAL)-2)"`,
  )
  expect(keepCharsFromLeftScrubberSQL({ count: 5, replacement: 'X' })).toMatchInlineSnapshot(
    `"SUBSTR(VAL, 0, 5) || REPEAT('X', LEAST(0, LEN(VAL)-5)"`,
  )
  expect(
    keepCharsFromLeftScrubberSQL({ count: 2, replacement: 'X', replaceFull: true }),
  ).toMatchInlineSnapshot(`"IFF(LEN(VAL) > 2, SUBSTR(VAL, 0, 2) || 'X', VAL)"`)
})

describe('randomScrubber', () => {
  test('generates with default arguments', () => {
    const result = randomScrubber('secret')
    expect(result).not.toBe('secret')
  })

  test('accepts length', () => {
    const result = randomScrubber('secret', { length: 5 })
    expect(result).toHaveLength(5)
  })

  test('accepts alphabet and length', () => {
    const result = randomScrubber('secret', { alphabet: 'a', length: 5 })
    expect(result).toBe('aaaaa')
  })
})

test('randomScrubberSQL', () => {
  expect(randomScrubberSQL()).toMatchInlineSnapshot(`"RANDSTR(16, HASH(RANDOM()))"`)
  expect(randomScrubberSQL({ length: 5 })).toMatchInlineSnapshot(`"RANDSTR(5, HASH(RANDOM()))"`)
})

describe('randomEmailScrubber', () => {
  test('generates with default arguments', () => {
    const result = randomEmailScrubber('secret')
    expect(result).not.toBe('secret')
    expect(result).toContain('@example.com')
  })

  test('accepts alphabet, length and domain', () => {
    const result = randomEmailScrubber('secret', {
      alphabet: 'a',
      length: 5,
      domain: '@customdomain.com',
    })
    expect(result).toBe('aaaaa@customdomain.com')
  })
})

test('randomEmailScrubberSQL', () => {
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
  test('scrub content without email', () => {
    const content = 'I am a string without and email in it @hello!'
    const result = randomEmailInContentScrubber(content)
    expect(result).toEqual(content)
  })

  test('scrub email in URL', () => {
    const email = 'real@gmail.com'
    const prefix = '/api/user/'
    const result = randomEmailInContentScrubber(prefix + email)
    expect(result).not.toContain(email)
    expect(result).toContain(prefix)
  })

  test('scrub complex email in text', () => {
    const email = 'real_email-address.2@gmail2.com.br'
    const suffix = ', not a gmail2.com.br address'
    const text = 'This should be a random email: ' + email + suffix
    const result = randomEmailInContentScrubber(text)

    expect(result).not.toContain(email)
    expect(result).not.toContain('real')
    expect(result).not.toContain('example.com.br') // test multi.dot domains
    expect(result).toContain(suffix)
  })

  test('scrub complex email with long TLD in text', () => {
    const text = 'Foo bar baz qux@quux.corge grault'
    const result = randomEmailInContentScrubber(text)

    expect(result).not.toContain('qux@quux.corge')
    expect(result).not.toContain(' qux')
    expect(result).not.toContain('ge grault') // not matching the full email
    expect(result).toContain('Foo bar baz ')
  })
})

test('randomEmailInContentScrubberSQL', () => {
  expect(randomEmailInContentScrubberSQL()).toMatchInlineSnapshot(`
    "REGEXP_REPLACE(
        VAL,
        '[a-zA-Z1-9._-]*@[a-zA-Z1-9._-]*\\.[a-zA-Z_-]{2,63}',
        RANDSTR(16, HASH(RANDOM()))
      ) || '@example.com'"
  `)
  expect(randomEmailInContentScrubberSQL({ length: 5 })).toMatchInlineSnapshot(`
    "REGEXP_REPLACE(
        VAL,
        '[a-zA-Z1-9._-]*@[a-zA-Z1-9._-]*\\.[a-zA-Z_-]{2,63}',
        RANDSTR(5, HASH(RANDOM()))
      ) || '@example.com'"
  `)
  expect(randomEmailInContentScrubberSQL({ length: 5, domain: '@customdomain.com' }))
    .toMatchInlineSnapshot(`
      "REGEXP_REPLACE(
          VAL,
          '[a-zA-Z1-9._-]*@[a-zA-Z1-9._-]*\\.[a-zA-Z_-]{2,63}',
          RANDSTR(5, HASH(RANDOM()))
        ) || '@customdomain.com'"
    `)
})

describe('saltedHashScrubber', () => {
  test('generates hash using initializationVector', () => {
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

test('saltedHashScrubberSQL', () => {
  const initializationVector = 'thisIsAStaticVector'
  expect(saltedHashScrubberSQL({ initializationVector })).toMatchInlineSnapshot(
    `"SHA2(VAL || 'thisIsAStaticVector', 256)"`,
  )
})

describe('saltedHashEmailScrubber', () => {
  test('generates hash using initializationVector and suffixes domain', () => {
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

test('saltedHashEmailScrubberSQL', () => {
  const initializationVector = 'staticvector'
  expect(saltedHashEmailScrubberSQL({ initializationVector })).toMatchInlineSnapshot(
    `"SHA2(VAL || 'staticvector', 256) || '@example.com'"`,
  )
  expect(
    saltedHashEmailScrubberSQL({ initializationVector, domain: '@naturalcycles.com' }),
  ).toMatchInlineSnapshot(`"SHA2(VAL || 'staticvector', 256) || '@naturalcycles.com'"`)
})

describe('bcryptStringScrubber', () => {
  test('generates valid bcrypt string while maintaining algo and cost factor', () => {
    const result = bcryptStringScrubber(bryptStr1)
    expect(result).not.toEqual(bryptStr1)
    expect(result!.substr(0, 7)).toBe('$2a$12$')
    expect(result!).toHaveLength(bryptStr1.length)
  })

  test('ensure older cost factor is preserved', () => {
    const result = bcryptStringScrubber(bryptStr2)
    expect(result).not.toEqual(bryptStr2)
    expect(result!.substr(0, 7)).toBe('$2a$10$')
  })
  test('handling undefined and empty', () => {
    const undefinedResult = bcryptStringScrubber(undefined)
    expect(undefinedResult).toBeUndefined()

    const emptyResult = bcryptStringScrubber('')
    expect(emptyResult).toBe('')
  })
  test('handling non-valid bcrypt strings, should return valid bcrypt string', () => {
    const result = bcryptStringScrubber('stringWithToFew$')
    expect(result!.substr(0, 7)).toBe('$2a$12$')
    expect(result!).toHaveLength(bryptStr1.length)
  })
  test('handling replacements map', () => {
    const params: BcryptStringScrubberParams = {
      replacements: '$2a$10$:$2a$10$456,$2a$12$:$2a$12$123',
    }
    const result = bcryptStringScrubber(bryptStr1, params)
    expect(result).toBe('$2a$12$123')

    const result2 = bcryptStringScrubber(bryptStr2, params)
    expect(result2).toBe('$2a$10$456')
  })
})

test('bcryptStringScrubberSQL', () => {
  expect(bcryptStringScrubberSQL()).toMatchSnapshot()
  expect(
    bcryptStringScrubberSQL({ replacements: '$2a$10$:$2a$10$456,$2a$12$:$2a$12$123' }),
  ).toMatchSnapshot()
})

describe('saltedHashSubstringScrubber', () => {
  const initializationVector = nanoid()

  test('should scrub the matching substring with a hash', () => {
    const result = saltedHashSubstringScrubber('foo|00:00:00:00:00:00|bar', {
      regex: '00:00:00:00:00:00',
      initializationVector,
    })

    expect(result).toMatch(/foo\|.{64}\|bar/)
    expect(result).not.toContain('00:00:00:00:00:00')
  })

  test('should scrub the same value with the same hash', () => {
    const result1 = saltedHashSubstringScrubber('foo|00:00:00:00:00:00|bar', {
      regex: '00:00:00:00:00:00',
      initializationVector,
    })

    const result2 = saltedHashSubstringScrubber('bee|00:00:00:00:00:00|boo', {
      regex: '00:00:00:00:00:00',
      initializationVector,
    })

    expect(result1?.substring(4, 64)).toBe(result2?.substring(4, 64))
  })

  test('should scrub substring using regex', () => {
    const result = saltedHashSubstringScrubber('foo|00:00:00:00:00:00|bar', {
      regex:
        '[0-9a-zA-Z]{2}:[0-9a-zA-Z]{2}:[0-9a-zA-Z]{2}:[0-9a-zA-Z]{2}:[0-9a-zA-Z]{2}:[0-9a-zA-Z]{2}',
      initializationVector,
    })

    expect(result).toMatch(/foo\|.{64}\|bar/)
    expect(result).not.toContain('00:00:00:00:00:00')
  })

  test('should scrub multiple occurrences', () => {
    const result = saltedHashSubstringScrubber('foo|max|bar|max|boo', {
      regex: 'max',
      initializationVector,
    })

    expect(result).not.toContain('max')
  })

  test('should throw when the salt is missing', () => {
    expect(() => saltedHashSubstringScrubber('foo|max|bar', { regex: 'max' } as any)).toThrow(
      'Initialization vector is missing',
    )
  })

  test('should throw when the regex or substring is missing', () => {
    expect(() =>
      saltedHashSubstringScrubber('foo|max|bar', {
        initializationVector,
      } as any),
    ).toThrow('Substring or regex is missing')
  })
})

describe('zipScrubber', () => {
  test.each([
    [undefined, undefined],
    ['', undefined],
    ['11225', '112XX'],
    ['123456789', '123XX'],
    ['ABC DEF', 'ABCXX'],
    ['ABC', 'ABCXX'],
    ['AB', 'ABXX'],
    ['A', 'AXX'],
    ['878123', 'XXXXX'],
  ])('anonymizes zip codes "%s" > "%s"', (zip, expected) => {
    const result = zipScrubber(zip)
    expect(result).toEqual(expected)
  })
})

test('zipScrubberSQL', () => {
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
test.each(scrubberNames)('the %s should have its SQL scrubber counterpart', scrubberName => {
  console.log(scrubberName, defaultScrubbersSQL[scrubberName])
  expect(defaultScrubbersSQL[scrubberName]).toBeDefined()
})

const sqlScrubberNames = _stringMapEntries(defaultScrubbersSQL).map(([k]) => k)
test.each(sqlScrubberNames)('the %s should have its scrubber counterpart', scrubberName => {
  expect(defaultScrubbers[scrubberName]).toBeDefined()
})
