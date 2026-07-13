import { expect, test } from 'vitest'
import { pExpectedError } from '../error/index.js'
import { _isBetween } from '../index.js'
import { timeSpan } from '../test/test.util.js'
import { pDelay, pDelayFn, pDelaySignal } from './pDelay.js'

test('pDelay', async () => {
  const end = timeSpan()
  await pDelay(100)
  expect(_isBetween(end(), 90, 160, '[)')).toBe(true)
})

test('pDelay with return value', async () => {
  const r = await pDelay(10, 'v')
  expect(r).toBe('v')

  const err = await pExpectedError(pDelay(10, new Error('yo')))
  expect(err).toMatchInlineSnapshot('[Error: yo]')
})

test('pDelayFn', async () => {
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

test('pDelayFn abort', async () => {
  const p = pDelayFn(100, () => {
    throw new Error('yo')
  })
  // Abort should not throw, but resolve immediately
  p.abort()

  await p
})

test('pDelaySignal without signal', async () => {
  const end = timeSpan()
  await pDelaySignal(100)
  expect(_isBetween(end(), 90, 160, '[)')).toBe(true)
})

test('pDelaySignal with a signal that never aborts', async () => {
  const controller = new AbortController()
  const end = timeSpan()
  await pDelaySignal(100, controller.signal)
  expect(_isBetween(end(), 90, 160, '[)')).toBe(true)
})

test('pDelaySignal with an already-aborted signal resolves immediately', async () => {
  const controller = new AbortController()
  controller.abort()
  const end = timeSpan()
  await pDelaySignal(10_000, controller.signal)
  expect(end()).toBeLessThan(50)
})

test('pDelaySignal resolves early when aborted mid-delay', async () => {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), 20)
  const end = timeSpan()
  await pDelaySignal(10_000, controller.signal)
  expect(_isBetween(end(), 15, 1000, '[)')).toBe(true)
})

test('pDelaySignal aborting after completion is a no-op', async () => {
  const controller = new AbortController()
  await pDelaySignal(10, controller.signal)
  controller.abort() // should not throw
})
