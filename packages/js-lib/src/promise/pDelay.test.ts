import { expect, it } from 'vitest'
import { pExpectedError } from '../error/index.js'
import { _isBetween } from '../index.js'
import { timeSpan } from '../test/test.util.js'
import { pDelay, pDelayFn, pDelaySignal } from './pDelay.js'

it('should resolve after the given delay', async () => {
  const end = timeSpan()
  await pDelay(100)
  expect(_isBetween(end(), 90, 160, '[)')).toBe(true)
})

it('should resolve with the given value, or reject with a given Error', async () => {
  const r = await pDelay(10, 'v')
  expect(r).toBe('v')

  const err = await pExpectedError(pDelay(10, new Error('yo')))
  expect(err).toMatchInlineSnapshot('[Error: yo]')
})

it('should resolve with the function result, or reject with its error', async () => {
  expect(await pDelayFn(10, () => 'yo')).toBe('yo')
  expect(await pDelayFn(10, async () => 'yo')).toBe('yo')

  expect(
    await pExpectedError(
      pDelayFn(10, () => {
        throw new Error('yo')
      }),
    ),
  ).toMatchInlineSnapshot('[Error: yo]')

  expect(
    await pExpectedError(
      pDelayFn(10, async () => {
        throw new Error('yo')
      }),
    ),
  ).toMatchInlineSnapshot('[Error: yo]')
})

it('should resolve instead of rejecting when aborted', async () => {
  const p = pDelayFn(100, () => {
    throw new Error('yo')
  })
  // Abort should not throw, but resolve immediately
  p.abort()

  await p
})

it('should resolve after the delay without a signal', async () => {
  const end = timeSpan()
  await pDelaySignal(100)
  expect(_isBetween(end(), 90, 160, '[)')).toBe(true)
})

it('should resolve after the delay with a signal that never aborts', async () => {
  const controller = new AbortController()
  const end = timeSpan()
  await pDelaySignal(100, controller.signal)
  expect(_isBetween(end(), 90, 160, '[)')).toBe(true)
})

it('should resolve immediately with an already aborted signal', async () => {
  const controller = new AbortController()
  controller.abort()
  const end = timeSpan()
  await pDelaySignal(10_000, controller.signal)
  expect(end()).toBeLessThan(50)
})

it('should resolve early when the signal aborts mid-delay', async () => {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), 20)
  const end = timeSpan()
  await pDelaySignal(10_000, controller.signal)
  expect(_isBetween(end(), 15, 1000, '[)')).toBe(true)
})

it('should not throw when the signal aborts after completion', async () => {
  const controller = new AbortController()
  await pDelaySignal(10, controller.signal)
  controller.abort() // should not throw
})
