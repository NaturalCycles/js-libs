import { expect, test } from 'vitest'
import { Intl2 } from './intl.js'

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
