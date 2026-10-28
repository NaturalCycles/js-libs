import { afterEach, expect, it, vi } from 'vitest'
import { AsyncManager } from './asyncManager.js'
import { pDelay } from './promise/pDelay.js'

afterEach(() => {
  AsyncManager.reset()
  vi.useRealTimers()
})

it('should resolve allDone without logging when there are no pending ops', async () => {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  await AsyncManager.allDone()
  expect(logSpy).not.toHaveBeenCalled()
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

it('should remove settled ops from pendingOps', async () => {
  AsyncManager.runInBackground(pDelay(10))
  AsyncManager.runInBackground(pDelay(10))
  expect(AsyncManager.pendingOps.size).toBe(2)

  await AsyncManager.allDone()

  expect(AsyncManager.pendingOps.size).toBe(0)
})

it('should resolve allDone at the timeout and warn about pending ops', async () => {
  vi.useFakeTimers()
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  AsyncManager.runInBackground(pDelay(500))

  let done = false
  void AsyncManager.allDone(50).then(() => (done = true))
  await vi.advanceTimersByTimeAsync(49)
  expect(done).toBe(false)

  await vi.advanceTimersByTimeAsync(1)
  expect(done).toBe(true)
  expect(warnSpy).toHaveBeenCalledWith(
    expect.stringContaining('timed out after 50 ms with 1 pending op(s)'),
  )
})

it('should log completion and not time out when ops finish before the allDone timeout', async () => {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  let resolved = false

  AsyncManager.runInBackground(
    pDelay(20).then(() => {
      resolved = true
    }),
  )

  await AsyncManager.allDone(500)
  expect(resolved).toBe(true)
  expect(warnSpy).not.toHaveBeenCalled()
  expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('allDone for 1 op(s)'))
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
