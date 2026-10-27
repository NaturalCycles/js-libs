import { expect, it } from 'vitest'
import { TimeoutError } from '../error/error.util.js'
import { pExpectedError } from '../error/try.js'
import { pDelay } from './pDelay.js'
import { pTimeout, pTimeoutFn } from './pTimeout.js'

it('should resolve with the result when pTimeoutFn finishes in time', async () => {
  const fn = async (name: string): Promise<string> => await pDelay(10, `hello ${name}`)
  const decoratedFn = pTimeoutFn(fn, { timeout: 100 })
  expect(await decoratedFn('world')).toBe('hello world')
})

it('should reject with a TimeoutError named after the function from pTimeoutFn', async () => {
  const fn = (): Promise<void> => pDelay(100)
  const decoratedFn = pTimeoutFn(fn, { timeout: 10 })
  const err = await pExpectedError(decoratedFn(), TimeoutError)
  expect(err).toMatchInlineSnapshot(`[TimeoutError: "fn" timed out after 10 ms]`)
  expect(err).toBeInstanceOf(TimeoutError)
})

it('should use the custom name and the onTimeout error or result in pTimeoutFn', async () => {
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

it('should resolve with the result when pTimeout finishes in time', async () => {
  const r = await pTimeout(() => pDelay(10, 'hello world'), { timeout: 100 })
  expect(r).toBe('hello world')
})

it('should resolve with the result with a timeout of 0', async () => {
  const r = await pTimeout(async () => 'hi', { timeout: 0 })
  expect(r).toBe('hi')
})

it('should keep the caller in the TimeoutError stack', async () => {
  const err = await pExpectedError(timeoutFail(), TimeoutError)

  console.log(err)
  // console.log(err.stack)
  expect(err.stack).toContain('at timeoutFail')
})

async function timeoutFail(): Promise<void> {
  await pTimeout(() => pDelay(100, 'hello world'), { timeout: 10 })
}

it('should not abort the signal on success', async () => {
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

it('should abort the signal with a TimeoutError on timeout', async () => {
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

it('should abort the signal with the thrown error as the reason', async () => {
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

it('should reject with the TimeoutError when the function rejects on abort', async () => {
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

it('should provide a signal that never aborts with a timeout of 0', async () => {
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

it('should abort the signal on timeout when onTimeout returns a fallback', async () => {
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
