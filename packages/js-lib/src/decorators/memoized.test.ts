import { beforeEach, expect, it } from 'vitest'
import { _memoized } from './memoized.js'

let calledTimes = 0

function fnOrig(n = 1): number {
  console.log(`fnOrig(${n}) called`)
  calledTimes++
  return n * 2
}

const fn = _memoized(fnOrig)

beforeEach(() => {
  calledTimes = 0
})

it('should call the function once per set of args until the cache is cleared', () => {
  let expectedCallTimes = 0
  expect(calledTimes).toBe(expectedCallTimes)

  // call 1: miss
  fn()
  expect(calledTimes).toBe(++expectedCallTimes)

  // call 2: hit
  fn()
  expect(calledTimes).toBe(expectedCallTimes)

  // call 3: hit
  fn()
  expect(calledTimes).toBe(expectedCallTimes)

  // call 4: miss
  fn(2)
  expect(calledTimes).toBe(++expectedCallTimes)

  // call 5: hit
  fn(2)
  expect(calledTimes).toBe(expectedCallTimes)

  // call 6: hit
  fn()
  expect(calledTimes).toBe(expectedCallTimes)

  // Tricky case: calling with n=1 is not the same cacheKey as calling with no-args
  fn(1)
  expect(calledTimes).toBe(++expectedCallTimes)

  // Drop cache
  fn.cache.clear()
  fn()
  expectedCallTimes++
  expect(calledTimes).toBe(expectedCallTimes)
})
