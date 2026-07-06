import { expect, test } from 'vitest'
import { Intl2 } from './intl.js'

// oxlint-disable no-restricted-globals

test('should return a DateTimeFormat instance', () => {
  const fmt = Intl2.DateTimeFormat('en-US', { year: 'numeric' })
  expect(fmt).toBeInstanceOf(Intl.DateTimeFormat)
})

test('should return the same instance for the same arguments', () => {
  const a = Intl2.DateTimeFormat('en-US', { year: 'numeric' })
  const b = Intl2.DateTimeFormat('en-US', { year: 'numeric' })
  expect(a).toBe(b)
})

test('should return different instances for different locales', () => {
  const a = Intl2.DateTimeFormat('en-US', { year: 'numeric' })
  const b = Intl2.DateTimeFormat('de-DE', { year: 'numeric' })
  expect(a).not.toBe(b)
})

test('should return different instances for different options', () => {
  const a = Intl2.DateTimeFormat('en-US', { year: 'numeric' })
  const b = Intl2.DateTimeFormat('en-US', { year: '2-digit' })
  expect(a).not.toBe(b)
})

test('getTimezone', () => {
  expect(Intl2.getTimezone()).toBe('UTC')
})

test('DurationFormat', () => {
  const fmt = Intl2.DurationFormat('en-US', { style: 'long' })
  expect(fmt).toBeInstanceOf(Intl.DurationFormat)
  expect(fmt.format({ hours: 1, minutes: 30 })).toBe('1 hour, 30 minutes')
})

test('Segmenter', () => {
  const seg = Intl2.Segmenter('en-US', { granularity: 'word' })
  expect(seg).toBeInstanceOf(Intl.Segmenter)
  const words = Array.from(seg.segment('hello world')).filter(s => s.isWordLike)
  expect(words).toHaveLength(2)
})
