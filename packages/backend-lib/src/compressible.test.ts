import { expect, it } from 'vitest'
import { compressible } from './compressible.js'

it.each([
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
])('should treat %s as compressible', type => {
  expect(compressible(type)).toBe(true)
})

it.each([
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
])('should not treat %s as compressible', type => {
  expect(compressible(type)).toBe(false)
})
