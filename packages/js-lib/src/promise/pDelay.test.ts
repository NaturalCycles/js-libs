import { expect, test } from 'vitest'
import { _isBetween, pDelayFn, pExpectedError } from '../index.js'
import { timeSpan } from '../test/test.util.js'
import { pDelay } from './pDelay.js'

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
