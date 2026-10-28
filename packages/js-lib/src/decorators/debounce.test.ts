import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DebounceOptions, ThrottleOptions } from './debounce.js'
import { _asyncDebounce, _asyncThrottle, _debounce, _throttle } from './debounce.js'

afterEach(() => {
  vi.useRealTimers()
})

describe('_debounce', () => {
  it.each<{ opt: DebounceOptions; expected: number[] }>([
    { opt: {}, expected: [10] },
    { opt: { leading: true }, expected: [1, 10] },
    { opt: { leading: true, trailing: false }, expected: [1] },
    { opt: { trailing: false }, expected: [] },
    { opt: { maxWait: 50 }, expected: [5, 10] },
    { opt: { leading: true, maxWait: 50 }, expected: [1, 5, 10] },
  ])(
    'should invoke with $expected for $opt when called with 1 to 10 every 10 ms',
    ({ opt, expected }) => {
      vi.useFakeTimers()
      const fn = vi.fn<(n: number) => void>()

      callTenTimesEvery10ms(_debounce(fn, 20, opt))

      expect(fn.mock.calls).toEqual(expected.map(arg => [arg]))
    },
  )
})

describe('_throttle', () => {
  it.each<{ opt: ThrottleOptions; expected: number[] }>([
    { opt: {}, expected: [1, 2, 4, 6, 8, 10] },
    { opt: { trailing: false }, expected: [1, 3, 5, 7, 9] },
    { opt: { leading: false }, expected: [2, 4, 6, 8, 10] },
    { opt: { leading: false, trailing: false }, expected: [] },
  ])(
    'should invoke with $expected for $opt when called with 1 to 10 every 10 ms',
    ({ opt, expected }) => {
      vi.useFakeTimers()
      const fn = vi.fn<(n: number) => void>()

      callTenTimesEvery10ms(_throttle(fn, 20, opt))

      expect(fn.mock.calls).toEqual(expected.map(arg => [arg]))
    },
  )
})

describe('_asyncDebounce', () => {
  it('should return a promise that resolves with the invocation result', async () => {
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

  it('should coalesce rapid calls into one invocation and resolve all callers with that result', async () => {
    let calls = 0
    const fn = _asyncDebounce(async (n: number) => {
      calls++
      return n
    }, 20)

    const results = await Promise.all([fn(1), fn(2), fn(3)])
    expect(results).toEqual([3, 3, 3])
    expect(calls).toBe(1)
  })

  it('should reject all coalesced callers when the invocation throws', async () => {
    const fn = _asyncDebounce(async () => {
      throw new Error('boom')
    }, 20)

    const p1 = fn()
    const p2 = fn()

    await expect(p1).rejects.toThrow('boom')
    await expect(p2).rejects.toThrow('boom')
  })

  it('should reject pending promises on cancel()', async () => {
    const fn = _asyncDebounce(async (n: number) => n, 50)

    const p = fn(1)
    fn.cancel()

    await expect(p).rejects.toThrow('asyncDebounce cancelled')
  })

  it('should resolve dropped calls with undefined when the config yields no invocation (trailing: false)', async () => {
    const fn = _asyncDebounce(async (n: number) => n, 20, { trailing: false })

    expect(await fn(1)).toBeUndefined()
  })
})

describe('_asyncThrottle', () => {
  it('should invoke the first call at once and resolve it with its result', async () => {
    let calls = 0
    const fn = _asyncThrottle(async (n: number) => {
      calls++
      return n
    }, 50)

    const promise = fn(7)
    expect(calls).toBe(1)
    expect(await promise).toBe(7)
    expect(calls).toBe(1)
  })

  it('should resolve the leading caller but resolve in-window callers with undefined when trailing is disabled', async () => {
    const fn = _asyncThrottle(async (n: number) => n, 50, { trailing: false })

    expect(await fn(1)).toBe(1)
    expect(await fn(2)).toBeUndefined()
  })
})

function callTenTimesEvery10ms(fn: (n: number) => void): void {
  for (let n = 1; n <= 10; n++) {
    fn(n)
    vi.advanceTimersByTime(10)
  }
  vi.advanceTimersByTime(100)
}
