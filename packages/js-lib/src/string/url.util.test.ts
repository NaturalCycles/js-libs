import { expect, it } from 'vitest'
import { _parseQueryString, _toUrlOrNull } from './url.util.js'

it.each([
  ['', {}],
  ['?a', { a: '' }],
  ['a', { a: '' }],
  ['a=', { a: '' }],
  ['a&b', { a: '', b: '' }],
  ['a&b=', { a: '', b: '' }],
  ['a=1&b=', { a: '1', b: '' }],
  ['a=1&b=&c', { a: '1', b: '', c: '' }],
  [
    '?url=http%3A%2F%2Fgoogle.com%2F%3Fyo%3Dvalue%20with%20space&other=too',
    {
      url: 'http://google.com/?yo=value with space',
      other: 'too',
    },
  ],
])('should parse the query string %s into %s', (search, result) => {
  expect(_parseQueryString(search)).toEqual(result)

  // Just checking that the same can be achieved with URLSearchParams
  const r = Object.fromEntries(new URLSearchParams(search).entries())
  expect(r).toEqual(result)
})

it.each([
  // Valid urls
  [['http://google.com'], 'http://google.com/'],
  [['https://google.com'], 'https://google.com/'],

  // Valid paths agains valid base
  [['/directory', 'http://google.com'], 'http://google.com/directory'],
  [['../directory', 'http://google.com/directory'], 'http://google.com/directory'],
  [['directory', 'http://google.com'], 'http://google.com/directory'],

  // Invalid url with no base
  [['directory'], null],

  // Invalid url with invalid base
  [['directory', 'invalid'], null],

  // No url or base
  [[undefined], null],
  [[undefined, undefined], null],
] as const)('should parse %s into %s with _toUrlOrNull', ([url, base], result) => {
  const parsed = _toUrlOrNull(url, base)
  if (result === null) {
    expect(parsed).toBeNull()
    return
  }
  expect(parsed).toBeInstanceOf(URL)
  expect(parsed?.href).toBe(result)
})
