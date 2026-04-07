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

test('pTimeout signal is not aborted on success', async () => {
  let receivedSignal: AbortSignal | undefined
  await pTimeout(
    signal => {
      receivedSignal = signal
      return pDelay(10, 'ok')
    },
    { timeout: 100 },
  )
  expect(receivedSignal).toBeDefined()
  expect(receivedSignal!.aborted).toBe(false)
})

test('pTimeout signal is aborted on timeout', async () => {
  let receivedSignal: AbortSignal | undefined
  await pExpectedError(
    pTimeout(
      signal => {
        receivedSignal = signal
        return pDelay(100)
      },
      { timeout: 10 },
    ),
    TimeoutError,
  )
  expect(receivedSignal).toBeDefined()
  expect(receivedSignal!.aborted).toBe(true)
  expect(receivedSignal!.reason).toBeInstanceOf(TimeoutError)
})

test('pTimeout signal abort reason matches the thrown error', async () => {
  let receivedSignal: AbortSignal | undefined
  const err = await pExpectedError(
    pTimeout(
      signal => {
        receivedSignal = signal
        return pDelay(100)
      },
      { timeout: 10, name: 'myOp' },
    ),
    TimeoutError,
  )
  expect(receivedSignal!.reason).toBe(err)
})

test('pTimeout fn can use signal to short-circuit', async () => {
  const result = await pExpectedError(
    pTimeout(
      signal =>
        new Promise((_resolve, reject) => {
          // oxlint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          signal.addEventListener('abort', () => reject(signal.reason))
        }),
      { timeout: 10 },
    ),
    TimeoutError,
  )
  expect(result).toMatchInlineSnapshot(`[TimeoutError: "pTimeout function" timed out after 10 ms]`)
})

test('pTimeout signal is provided but never aborted with timeout 0', async () => {
  let receivedSignal: AbortSignal | undefined
  const r = await pTimeout(
    signal => {
      receivedSignal = signal
      return Promise.resolve('hi')
    },
    { timeout: 0 },
  )
  expect(r).toBe('hi')
  expect(receivedSignal).toBeDefined()
  expect(receivedSignal!.aborted).toBe(false)
})

test('pTimeout signal is aborted on timeout with onTimeout', async () => {
  let receivedSignal: AbortSignal | undefined
  const r = await pTimeout(
    signal => {
      receivedSignal = signal
      return pDelay(100, 'late')
    },
    { timeout: 10, onTimeout: () => 'fallback' },
  )
  expect(r).toBe('fallback')
  expect(receivedSignal!.aborted).toBe(true)
  expect(receivedSignal!.reason).toBeInstanceOf(TimeoutError)
})
