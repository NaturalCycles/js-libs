import { afterEach, expect, test, vi } from 'vitest'
import { AsyncManager } from './asyncManager.js'
import { _isBetween } from './index.js'
import { pDelay } from './promise/pDelay.js'
import { timeSpan } from './test/test.util.js'

afterEach(() => AsyncManager.reset())

test('allDone resolves immediately when no pending ops', async () => {
  await AsyncManager.allDone()
})

test('allDone waits for all pending ops', async () => {
  let resolved = false

  AsyncManager.runInBackground(
    pDelay(50).then(() => {
      resolved = true
    }),
  )

  expect(resolved).toBe(false)
  await AsyncManager.allDone()
  expect(resolved).toBe(true)
})

test('allDone does not throw on rejected ops', async () => {
  AsyncManager.runInBackground(Promise.reject(new Error('boom')))
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  await AsyncManager.allDone()
  expect(errorSpy).toHaveBeenCalledWith('AsyncManager unhandled rejection:', expect.any(Error))
  errorSpy.mockRestore()
})

test('rejected ops fire onError hooks', async () => {
  const errors: Error[] = []
  AsyncManager.onError(err => errors.push(err))

  AsyncManager.runInBackground(Promise.reject(new Error('boom')))
  await AsyncManager.allDone()

  expect(errors).toHaveLength(1)
  expect(errors[0]!.message).toBe('boom')
})

test('pendingOps is cleaned up after settlement', async () => {
  AsyncManager.runInBackground(pDelay(10))
  AsyncManager.runInBackground(pDelay(10))
  await AsyncManager.allDone()

  // A second allDone should resolve immediately since the set is empty
  const end = timeSpan()
  await AsyncManager.allDone()
  expect(end()).toBeLessThan(20)
})

test('allDone with timeout resolves early and logs', async () => {
  const logSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  AsyncManager.runInBackground(pDelay(500))

  const end = timeSpan()
  await AsyncManager.allDone(50)
  expect(_isBetween(end(), 30, 120, '[)')).toBe(true)
  expect(logSpy).toHaveBeenCalledWith(
    expect.stringContaining('timed out after 50 ms with 1 pending op(s)'),
  )
  logSpy.mockRestore()
})

test('allDone with timeout does not log timeout if ops finish before timeout', async () => {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  let resolved = false

  AsyncManager.runInBackground(
    pDelay(20).then(() => {
      resolved = true
    }),
  )

  await AsyncManager.allDone(500)
  expect(resolved).toBe(true)
  expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('timed out'))
  expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('allDone for 1 op(s)'))
  logSpy.mockRestore()
})

test('multiple onError hooks are all called', async () => {
  const calls: number[] = []
  AsyncManager.onError(() => calls.push(1))
  AsyncManager.onError(() => calls.push(2))

  AsyncManager.runInBackground(Promise.reject(new Error('boom')))
  await AsyncManager.allDone()

  expect(calls).toEqual([1, 2])
})

test('runInBackground with multiple concurrent ops', async () => {
  const order: number[] = []

  AsyncManager.runInBackground(
    pDelay(30).then(() => {
      order.push(1)
    }),
  )
  AsyncManager.runInBackground(
    pDelay(10).then(() => {
      order.push(2)
    }),
  )

  await AsyncManager.allDone()
  expect(order).toEqual([2, 1])
})
