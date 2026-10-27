import { expect, it } from 'vitest'
import { pDefer } from './pDefer.js'
import { pDelay } from './pDelay.js'
import { pState } from './pState.js'

it('should report a hanging promise as pending', async () => {
  const p = new Promise(() => {}) // hanging promise
  expect(await pState(p)).toBe('pending')
  await pDelay(100)
  expect(await pState(p)).toBe('pending')
})

it('should report a resolved deferred as resolved', async () => {
  const p = pDefer<string>()
  expect(await pState(p)).toBe('pending')
  await pDelay(100)
  p.resolve('hello')
  expect(await pState(p)).toBe('resolved')
  expect(await p).toBe('hello')
})

it('should report a rejected deferred as rejected', async () => {
  const p = pDefer<string>()
  expect(await pState(p)).toBe('pending')
  await pDelay(100)
  p.reject(new Error('bad'))
  expect(await pState(p)).toBe('rejected')
  await expect(p).rejects.toThrow('bad')
})
