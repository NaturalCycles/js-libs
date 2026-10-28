import { afterEach, describe, expect, it, vi } from 'vitest'
import { _AsyncDebounce, _AsyncThrottle, _Debounce } from './debounce.decorator.js'

afterEach(() => {
  vi.useRealTimers()
})

describe('@_Debounce', () => {
  it('should call the decorated method once, with the last args, after the calls stop', () => {
    vi.useFakeTimers()

    class C {
      calls: number[] = []

      @_Debounce(20)
      fn(n: number): void {
        this.calls.push(n)
      }
    }

    const inst = new C()
    for (let n = 1; n <= 10; n++) {
      inst.fn(n)
      vi.advanceTimersByTime(10)
    }
    expect(inst.calls).toEqual([])

    vi.advanceTimersByTime(100)
    expect(inst.calls).toEqual([10])
  })
})

describe('@_AsyncDebounce', () => {
  it('should coalesce calls and resolve every caller with a real result (never undefined)', async () => {
    class C {
      calls = 0

      @_AsyncDebounce(20)
      async save(n: number): Promise<number> {
        this.calls++
        return n
      }
    }

    const inst = new C()
    const results = await Promise.all([inst.save(1), inst.save(2), inst.save(3)])

    expect(results).toEqual([3, 3, 3])
    expect(inst.calls).toBe(1)
  })
})

describe('@_AsyncThrottle', () => {
  it('should invoke the first call at once and resolve it with its result', async () => {
    class C {
      calls = 0

      @_AsyncThrottle(50)
      async ping(n: number): Promise<number> {
        this.calls++
        return n
      }
    }

    const inst = new C()
    const promise = inst.ping(7)
    expect(inst.calls).toBe(1)
    expect(await promise).toBe(7)
    expect(inst.calls).toBe(1)
  })

  it('should resolve in-window calls with undefined when trailing is disabled', async () => {
    class C {
      calls = 0

      @_AsyncThrottle(50, { trailing: false })
      async ping(n: number): Promise<number> {
        this.calls++
        return n
      }
    }

    const inst = new C()
    expect(await inst.ping(1)).toBe(1)
    expect(await inst.ping(2)).toBeUndefined()
    expect(inst.calls).toBe(1)
  })
})
