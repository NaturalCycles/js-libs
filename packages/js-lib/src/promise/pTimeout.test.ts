import { expect, test } from 'vitest'
import { TimeoutError } from '../error/error.util.js'
import { pExpectedError } from '../error/try.js'
import { pDelay } from './pDelay.js'
import { pTimeout, pTimeoutFn } from './pTimeout.js'

test('pTimeoutFn happy case', async () => {
  const fn = async (name: string): Promise<string> => await pDelay(10, `hello ${name}`)
  const decoratedFn = pTimeoutFn(fn, { timeout: 100 })
  expect(await decoratedFn('world')).toBe('hello world')
})

test('pTimeoutFn default error', async () => {
  const fn = (): Promise<void> => pDelay(100)
  const decoratedFn = pTimeoutFn(fn, { timeout: 10 })
  const err = await pExpectedError(decoratedFn(), TimeoutError)
  expect(err).toMatchInlineSnapshot(`[TimeoutError: "fn" timed out after 10 ms]`)
  expect(err).toBeInstanceOf(TimeoutError)
})

test('pTimeoutFn options', async () => {
  const fn = (): Promise<void> => pDelay(100)
  const decoratedFn = pTimeoutFn(fn, { timeout: 10, name: 'custom name' })
  const err = await pExpectedError(decoratedFn(), TimeoutError)
  expect(err).toMatchInlineSnapshot(`[TimeoutError: "custom name" timed out after 10 ms]`)

  await expect(
    pTimeoutFn(fn, {
      timeout: 10,
      onTimeout: timeoutErr => {
        expect(timeoutErr).toMatchInlineSnapshot(`[TimeoutError: "fn" timed out after 10 ms]`)
        throw new Error('custom error')
      },
    })(),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: custom error]`)

  expect(await pTimeoutFn(fn, { timeout: 10, onTimeout: () => 'all good' })()).toBe('all good')
})

test('pTimeout happy case', async () => {
  const r = await pTimeout(() => pDelay(10, 'hello world'), { timeout: 100 })
  expect(r).toBe('hello world')
})

test('pTimeout 0 timeout direct execution', async () => {
  const r = await pTimeout(async () => 'hi', { timeout: 0 })
  expect(r).toBe('hi')
})

test('pTimeout stack', async () => {
  const err = await pExpectedError(timeoutFail(), TimeoutError)

  console.log(err)
  // console.log(err.stack)
  expect(err.stack).toContain('at timeoutFail')
})

async function timeoutFail(): Promise<void> {
  await pTimeout(() => pDelay(100, 'hello world'), { timeout: 10 })
}
