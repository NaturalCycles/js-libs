import { expect, test } from 'vitest'
import { _expectedErrorString } from './error/try.js'
import { _quickSemverCompare, semver2 } from './semver.js'

// oxlint-disable typescript/restrict-template-expressions

test('basic', () => {
  const s = semver2('1.2.3')
  expect(s.toString()).toBe('1.2.3')
  expect(`${s}`).toBe('1.2.3')
  expect(JSON.stringify(s)).toBe('"1.2.3"')
  expect(s.toJSON()).toBe('1.2.3')
  expect(s.tokens).toEqual([1, 2, 3])
  expect(s.major).toBe(1)
  expect(s.minor).toBe(2)
  expect(s.patch).toBe(3)

  const s2 = semver2.fromInput('1.2.5')
  expect(s.compare(s2)).toBe(-1)
  expect(s.isAfter(s2)).toBe(false)
  expect(s.isSameOrAfter(s2)).toBe(false)
  expect(s.isBefore(s2)).toBe(true)
  expect(s.isSameOrBefore(s2)).toBe(true)
  expect(s.isSame(s2)).toBe(false)
  expect(semver2('1.5.4').isSame('1.5.4')).toBe(true)
  expect(semver2('1.5.4').isSame(semver2('1.5.4'))).toBe(true)

  expect(_expectedErrorString(() => semver2(''))).toMatchInlineSnapshot(
    `"AssertionError: Cannot parse "" into Semver"`,
  )
})

test('min, max, sort', () => {
  expect(semver2.min(['1.2.3', '1.2.4']).toString()).toBe('1.2.3')
  expect(semver2.min(['1.2.3', undefined]).toString()).toBe('1.2.3')
  expect(semver2.minOrUndefined(['1.2.3', '1.2.4'])?.toString()).toBe('1.2.3')
  expect(semver2.minOrUndefined(['1.2.5'])?.toString()).toBe('1.2.5')
  expect(semver2.minOrUndefined([])).toBeUndefined()

  expect(semver2.max(['1.2.3', '1.2.4']).toString()).toBe('1.2.4')
  expect(semver2.maxOrUndefined(['1.2.3', '1.2.4'])?.toString()).toBe('1.2.4')
  expect(semver2.maxOrUndefined(['1.2.5'])?.toString()).toBe('1.2.5')
  expect(semver2.maxOrUndefined([])).toBeUndefined()

  expect(semver2.sort(['1.2.4', '1.2.5', '1.1.9', '1.7.7'].map(semver2)).map(s => s.toString()))
    .toMatchInlineSnapshot(`
[
  "1.1.9",
  "1.2.4",
  "1.2.5",
  "1.7.7",
]
`)
})

test.each([
  [undefined, undefined],
  [null, undefined],
  ['', undefined],
  ['0', '0.0.0'],
  ['1', '1.0.0'],
  ['0.0.1', '0.0.1'],
  ['0.0.1a', '0.0.1'],
  ['0.a0.1a', '0.0.1'],
  ['.a0.1a', '0.0.1'],
  ['.', '0.0.0'],
  ['x', '0.0.0'],
])('parse', (str, expected) => {
  expect(semver2.fromInputOrUndefined(str)?.toString()).toBe(expected)
})

test.each([
  ['', '', 0],
  ['a', '', 1],
  ['1', '', 1],
  ['1', '1', 0],
  ['1.', '1', 0],
  ['1.0', '1.0', 0],
  ['1.1', '1.0', 1],
  ['1.1', '1.1.1', -1],
  ['1.1.3', '1.1.51', -1],
  ['1.1.3', '1.1.11', -1],
  ['1.1.11', '1.1.3', 1],
])('_quickSemverCompare "%s" "%s" is %s', (a, b, expected) => {
  expect(_quickSemverCompare(a, b)).toBe(expected)
})
