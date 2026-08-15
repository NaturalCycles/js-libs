import { beforeEach, expect, test } from 'vitest'
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

test('memoFn', async () => {
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
