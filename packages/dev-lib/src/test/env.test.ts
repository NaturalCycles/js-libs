import { expect, it } from 'vitest'

it('APP_ENV should be `test`', () => {
  console.log('hello from env test')
  expect(process.env['APP_ENV']).toBe('test')
})

it('TZ should be UTC', () => {
  expect(process.env['TZ']).toBe('UTC')
})
