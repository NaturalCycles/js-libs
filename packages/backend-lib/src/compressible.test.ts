import { expect, test } from 'vitest'
import { compressible } from './compressible.js'

test.each([
  'text/html',
  'text/plain; charset=utf-8',
  'TEXT/CSS',
  'application/json',
  ' application/json;charset=utf-8',
  'application/javascript',
  'application/xml',
  'application/x-www-form-urlencoded',
  'application/ld+json',
  'application/vnd.foo+xml; a=b',
  'image/svg+xml',
  'image/x-icon',
  'font/ttf',
])('compressible: %s', type => {
  expect(compressible(type)).toBe(true)
})

test.each([
  '',
  'foo',
  'image/png',
  'image/jpeg',
  'video/mp4',
  'application/zip',
  'application/gzip',
  'application/pdf',
  'font/woff2',
  'application/x-unknown',
])('not compressible: %s', type => {
  expect(compressible(type)).toBe(false)
})
