import { expect, it } from 'vitest'
import { Intl2 } from './intl.js'

// oxlint-disable no-restricted-globals

it('should return a DateTimeFormat instance', () => {
  const fmt = Intl2.DateTimeFormat('en-US', { year: 'numeric' })
  expect(fmt).toBeInstanceOf(Intl.DateTimeFormat)
})

it('should return the same instance for the same arguments', () => {
  const a = Intl2.DateTimeFormat('en-US', { year: 'numeric' })
  const b = Intl2.DateTimeFormat('en-US', { year: 'numeric' })
  expect(a).toBe(b)
})

it('should return different instances for different locales', () => {
  const a = Intl2.DateTimeFormat('en-US', { year: 'numeric' })
  const b = Intl2.DateTimeFormat('de-DE', { year: 'numeric' })
  expect(a).not.toBe(b)
})

it('should return different instances for different options', () => {
  const a = Intl2.DateTimeFormat('en-US', { year: 'numeric' })
  const b = Intl2.DateTimeFormat('en-US', { year: '2-digit' })
  expect(a).not.toBe(b)
})

it('should return the environment timezone', () => {
  expect(Intl2.getTimezone()).toBe('UTC')
})

it('should return a DurationFormat that formats hours and minutes', () => {
  const fmt = Intl2.DurationFormat('en-US', { style: 'long' })
  expect(fmt).toBeInstanceOf(Intl.DurationFormat)
  expect(fmt.format({ hours: 1, minutes: 30 })).toBe('1 hour, 30 minutes')
})

it('should return a Segmenter that splits text into words', () => {
  const seg = Intl2.Segmenter('en-US', { granularity: 'word' })
  expect(seg).toBeInstanceOf(Intl.Segmenter)
  const words = Array.from(seg.segment('hello world')).filter(s => s.isWordLike)
  expect(words).toHaveLength(2)
})

it('should return different instances for different Intl.Locale objects', () => {
  const a = Intl2.NumberFormat(new Intl.Locale('en-US'), {})
  const b = Intl2.NumberFormat(new Intl.Locale('sv-SE'), {})
  expect(a).not.toBe(b)
  expect(b.resolvedOptions().locale).toBe('sv-SE')
})

it('should share the cache between a Locale and its string tag', () => {
  const a = Intl2.NumberFormat(new Intl.Locale('de-DE'), {})
  const b = Intl2.NumberFormat('de-DE', {})
  const c = Intl2.NumberFormat([new Intl.Locale('de-DE')], {})
  expect(a).toBe(b)
  expect(c).not.toBe(a) // array key differs from a single locale key
})

it('should return a memoized list of supported timezones', () => {
  const a = Intl2.getSupportedTimezones()
  expect(a).toBe(Intl2.getSupportedTimezones())
  expect(a).toContain('Europe/Stockholm')
})

it('should return the same instance regardless of options key order', () => {
  const a = Intl2.DateTimeFormat('en-US', { year: 'numeric', month: 'long' })
  const b = Intl2.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
  expect(a).toBe(b)
})

it('should expose the native Intl as an escape hatch', () => {
  expect(Intl2.Intl).toBe(Intl)
  expect(Intl2.Intl.getCanonicalLocales('EN-us')).toEqual(['en-US'])
  expect(Intl2.DateTimeFormat('en-US', {})).toBeInstanceOf(Intl2.Intl.DateTimeFormat)
  expect(new Intl2.Intl.Locale('sv').maximize().region).toBe('SE')
})

it('should not cache instances created via the escape hatch', () => {
  const a = new Intl2.Intl.NumberFormat('en-US', {})
  const b = new Intl2.Intl.NumberFormat('en-US', {})
  expect(a).not.toBe(b)
  expect(a).not.toBe(Intl2.NumberFormat('en-US', {}))
})
