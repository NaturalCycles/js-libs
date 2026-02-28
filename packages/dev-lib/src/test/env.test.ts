import { expect, test } from 'vitest'

test('APP_ENV should be `test`', () => {
  console.log('hello from env test')
  expect(process.env['APP_ENV']).toBe('test')
})

test('TZ should be UTC', () => {
  expect(process.env['TZ']).toBe('UTC')
})
