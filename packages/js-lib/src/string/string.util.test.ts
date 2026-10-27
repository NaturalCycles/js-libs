import { expect, it } from 'vitest'
import {
  _substringAfter,
  _substringAfterLast,
  _substringBefore,
  _substringBeforeLast,
} from './index.js'
import {
  _capitalize,
  _lowerFirst,
  _nl2br,
  _removeWhitespace,
  _split,
  _substringBetweenLast,
  _toLowercase,
  _toUpperCase,
  _upperFirst,
} from './string.util.js'

it('capitalize', () => {
  expect(_capitalize('abc')).toBe('Abc')
  expect(_capitalize('aBc')).toBe('Abc')
})

it('toUppercase', () => {
  expect(_toUpperCase('abc')).toBe('ABC')
  expect(_toUpperCase('aBc')).toBe('ABC')
})

it('toLowercase', () => {
  expect(_toLowercase('ABC')).toBe('abc')
  expect(_toLowercase('aBc')).toBe('abc')
})

it('upperFirst', () => {
  expect(_upperFirst('abc')).toBe('Abc')
  expect(_upperFirst('aBc')).toBe('ABc')
})

it('lowerFirst', () => {
  expect(_lowerFirst('Abc')).toBe('abc')
})

it('removeWhitespace', () => {
  expect(_removeWhitespace(' 1 * A ')).toBe('1*A')
})

it('_split', () => {
  expect(_split('a b c', ' ', 1)).toEqual(['a b c'])
  expect(_split('a b c', ' ', 2)).toEqual(['a', 'b c'])
  expect(_split('a b c', ' ', 3)).toEqual(['a', 'b', 'c'])
  expect(_split('abc', '|', 3)).toEqual(['abc'])
})

it('substringBefore, substringAfter', () => {
  const s1 = 'someFile.test.ts'
  const s2 = '/Users/lalala/someFile.test.ts'

  expect(_substringBefore(s1, '.')).toBe('someFile')
  expect(_substringBefore(s1, '.ts')).toBe('someFile.test')
  expect(_substringAfter(s1, '.')).toBe('test.ts')
  expect(_substringAfter(s1, 'test.')).toBe('ts')
  expect(_substringBeforeLast(s2, '/')).toBe('/Users/lalala')
  expect(_substringAfterLast(s2, '/')).toBe('someFile.test.ts')
  expect(_substringAfterLast(s2, 'la')).toBe('/someFile.test.ts')
})

it('_substringBetweenLast', () => {
  const s = '/Users/lalala/someFile.test.ts'
  expect(_substringBetweenLast(s, '/', '.')).toBe('someFile')
})

it.each([
  ['', ''],
  ['a', 'a'],
  ['a\nb', 'a<br>\nb'],
])('_nl2br("%s") to be "%s"', (input, result) => {
  expect(_nl2br(input)).toBe(result)
})
