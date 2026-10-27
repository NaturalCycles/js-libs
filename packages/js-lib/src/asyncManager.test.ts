import { afterEach, expect, it, vi } from 'vitest'
import { AsyncManager } from './asyncManager.js'
import { _isBetween } from './index.js'
import { pDelay } from './promise/pDelay.js'
import { timeSpan } from './test/test.util.js'

afterEach(() => AsyncManager.reset())

it('should resolve allDone when there are no pending ops', async () => {
  await AsyncManager.allDone()
})

it('should wait in allDone for all pending ops', async () => {
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

it('should not throw in allDone on rejected ops and log them when no onError hook is set', async () => {
  AsyncManager.runInBackground(Promise.reject(new Error('boom')))
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  await AsyncManager.allDone()
  expect(errorSpy).toHaveBeenCalledWith('AsyncManager unhandled rejection', expect.any(Error))
  errorSpy.mockRestore()
})

it('should pass rejections of ops to the onError hook', async () => {
  const errors: Error[] = []
  AsyncManager.onError(err => errors.push(err))

  AsyncManager.runInBackground(Promise.reject(new Error('boom')))
  await AsyncManager.allDone()

  expect(errors).toHaveLength(1)
  expect(errors[0]!.message).toBe('boom')
})

it('should resolve a second allDone at once after the ops settle', async () => {
  AsyncManager.runInBackground(pDelay(10))
  AsyncManager.runInBackground(pDelay(10))
  await AsyncManager.allDone()

  // A second allDone should resolve immediately since the set is empty
  const end = timeSpan()
  await AsyncManager.allDone()
  expect(end()).toBeLessThan(20)
})

it('should resolve allDone at the timeout and warn about pending ops', async () => {
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

it('should log completion and not time out when ops finish before the allDone timeout', async () => {
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

it('should call every onError hook', async () => {
  const calls: number[] = []
  AsyncManager.onError(() => calls.push(1))
  AsyncManager.onError(() => calls.push(2))

  AsyncManager.runInBackground(Promise.reject(new Error('boom')))
  await AsyncManager.allDone()

  expect(calls).toEqual([1, 2])
})

it('should run ops concurrently and wait for all of them in allDone', async () => {
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
