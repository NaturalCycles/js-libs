import { afterEach, describe, expect, test, vi } from 'vitest'
import { _since } from '../datetime/index.js'
import { pDelay } from '../promise/index.js'
import type { AnyFunction, UnixTimestampMillis } from '../types.js'
import { _asyncDebounce, _asyncThrottle, _debounce } from './debounce.js'

afterEach(() => {
  vi.useRealTimers()
})

const originalFn = (started: UnixTimestampMillis, n: number): void =>
  console.log(`#${n} after ${_since(started)}`)

async function startTimer(fn: AnyFunction, interval: number, count: number): Promise<void> {
  const started = Date.now() as UnixTimestampMillis

  for (let i = 0; i < count; i++) {
    await pDelay(interval)
    fn(started, i + 1)
  }

  await pDelay(2000) // extra wait
}

test('_debounce', async () => {
  vi.useFakeTimers()

  const fn = _debounce(originalFn, 20, { leading: true, trailing: true, maxWait: 300 })

  const promise = startTimer(fn, 10, 10)
  await vi.runAllTimersAsync()
  await promise
})

// Test cases:
// _debounce leading=1 trailing=0 (default)
// _debounce leading=1 trailing=1
// _debounce leading=0 trailing=1
// _debounce leading=0 trailing=0
// _throttle leading=1 trailing=1 (default)
// _throttle leading=1 trailing=0
// _throttle leading=0 trailing=1
// _throttle leading=0 trailing=0

describe('_asyncDebounce', () => {
  test('should return a real promise (never undefined) resolving with the invocation result', async () => {
    let calls = 0
    const fn = _asyncDebounce(async (n: number) => {
      calls++
      return n * 2
    }, 20)

    const p = fn(5)
    expect(p).toBeInstanceOf(Promise)
    expect(await p).toBe(10)
    expect(calls).toBe(1)
  })

  test('should coalesce rapid calls into one invocation and resolve all callers with that result', async () => {
    let calls = 0
    const fn = _asyncDebounce(async (n: number) => {
      calls++
      return n
    }, 20)

    const results = await Promise.all([fn(1), fn(2), fn(3)])
    expect(results).toEqual([3, 3, 3]) // trailing edge invokes with the last args
    expect(calls).toBe(1)
  })

  test('should reject all coalesced callers when the invocation throws', async () => {
    const fn = _asyncDebounce(async () => {
      throw new Error('boom')
    }, 20)

    const p1 = fn()
    const p2 = fn()

    await expect(p1).rejects.toThrow('boom')
    await expect(p2).rejects.toThrow('boom')
  })

  test('should reject pending promises on cancel()', async () => {
    const fn = _asyncDebounce(async (n: number) => n, 50)

    const p = fn(1)
    fn.cancel()

    await expect(p).rejects.toThrow('asyncDebounce cancelled')
  })
})

describe('_asyncThrottle', () => {
  test('should invoke on the leading edge immediately', async () => {
    let calls = 0
    const fn = _asyncThrottle(async (n: number) => {
      calls++
      return n
    }, 50)

    expect(await fn(7)).toBe(7)
    expect(calls).toBe(1)
  })
})
