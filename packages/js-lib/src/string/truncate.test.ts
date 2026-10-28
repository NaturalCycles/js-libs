import { expect, it } from 'vitest'
import { _truncate, _truncateMiddle } from './string.util.js'

const s = '1234567890abcd'

it('should cut the string to the max length, omission included', () => {
  expect(_truncate(s, 1)).toBe('...')
  expect(_truncate(s, 2)).toBe('...')
  expect(_truncate(s, 3)).toBe('...')
  expect(_truncate(s, 4)).toBe('1...')
  expect(_truncate(s, 5)).toBe('12...')
  expect(_truncate(s, 10)).toBe('1234567...')
  expect(_truncate(s, 13)).toBe('1234567890...')
  expect(_truncate(s, 14)).toBe(s)
  expect(_truncate(s, 15)).toBe(s)
  expect(_truncate(s, 20)).toBe(s)

  expect(_truncate(s, 1, 'zz')).toBe('zz')
  expect(_truncate(s, 2, 'zz')).toBe('zz')
  expect(_truncate(s, 3, 'zz')).toBe('1zz')
})

it('should cut the middle of the string to the max length', () => {
  expect(_truncateMiddle(s, 1)).toBe('...')
  expect(_truncateMiddle(s, 2)).toBe('...')
  expect(_truncateMiddle(s, 3)).toBe('...')
  expect(_truncateMiddle(s, 4)).toBe('1...')
  expect(_truncateMiddle(s, 5)).toBe('1...d')
  expect(_truncateMiddle(s, 10)).toBe('1234...bcd')
  expect(_truncateMiddle(s, 11)).toBe('1234...abcd')
  expect(_truncateMiddle(s, 13)).toBe('12345...0abcd')
  expect(_truncateMiddle(s, 14)).toBe(s)
  expect(_truncateMiddle(s, 15)).toBe(s)
  expect(_truncateMiddle(s, 20)).toBe(s)
})
