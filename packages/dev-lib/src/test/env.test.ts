import { expect, it } from 'vitest'

it('should set APP_ENV to test', () => {
  console.log('hello from env test')
  expect(process.env['APP_ENV']).toBe('test')
})

it('should set TZ to UTC', () => {
  expect(process.env['TZ']).toBe('UTC')
})
