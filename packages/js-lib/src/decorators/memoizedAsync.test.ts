import { beforeEach, expect, it, vi } from 'vitest'
import { commonLoggerNoop } from '../log/commonLogger.js'
import type { CommonLogFunction } from '../log/commonLogger.js'
import { MapAsyncMemoCache } from './memo.util.js'
import { _memoizedAsync } from './memoizedAsync.js'

let calledTimes = 0

async function fnOrig(n = 1): Promise<number> {
  console.log(`fnOrig(${n}) called`)
  calledTimes++
  return n * 2
}

const fn = _memoizedAsync(fnOrig, {
  cacheFactory: () => new MapAsyncMemoCache(),
})

beforeEach(() => {
  calledTimes = 0
})

it('should call the function once per set of args until the cache is cleared', async () => {
  let expectedCallTimes = 0
  expect(calledTimes).toBe(expectedCallTimes)

  // call 1: miss
  await fn()
  expect(calledTimes).toBe(++expectedCallTimes)

  // call 2: hit
  await fn()
  expect(calledTimes).toBe(expectedCallTimes)

  // call 3: hit
  await fn()
  expect(calledTimes).toBe(expectedCallTimes)

  // call 4: miss
  await fn(2)
  expect(calledTimes).toBe(++expectedCallTimes)

  // call 5: hit
  await fn(2)
  expect(calledTimes).toBe(expectedCallTimes)

  // call 6: hit
  await fn()
  expect(calledTimes).toBe(expectedCallTimes)

  // Tricky case: calling with n=1 is not the same cacheKey as calling with no-args
  await fn(1)
  expect(calledTimes).toBe(++expectedCallTimes)

  // Drop cache
  await fn.cache.clear()
  await fn()
  expectedCallTimes++
  expect(calledTimes).toBe(expectedCallTimes)
})

it('should default to MapAsyncMemoCache', async () => {
  let calls = 0
  const double = _memoizedAsync(async (n: number) => {
    calls++
    return n * 2
  })

  expect(await double(2)).toBe(4)
  expect(await double(2)).toBe(4)
  expect(calls).toBe(1)
  expect(double.cache).toBeInstanceOf(MapAsyncMemoCache)
})

it('should call the function when the cache get fails', async () => {
  let calls = 0
  const error = vi.fn<CommonLogFunction>()
  const count = _memoizedAsync(
    async () => {
      calls++
      return calls
    },
    {
      cacheFactory: () => ({
        get: async () => {
          throw new Error('cache get failed')
        },
        set: async () => {},
        clear: async () => {},
      }),
      logger: { ...commonLoggerNoop, error },
    },
  )

  expect(await count()).toBe(1)
  expect(await count()).toBe(2)
  expect(error).toHaveBeenCalledTimes(2)
})
