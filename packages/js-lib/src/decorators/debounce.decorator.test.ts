import { describe, expect, test } from 'vitest'
import { _since } from '../datetime/index.js'
import { pDelay } from '../promise/index.js'
import type { AnyFunction, UnixTimestampMillis } from '../types.js'
import { _AsyncDebounce, _AsyncThrottle, _Debounce } from './debounce.decorator.js'

class C {
  // @debounce(200, {leading: true, trailing: true})
  // @throttle(200, {leading: true, trailing: true})
  @_Debounce(20)
  fn(started: UnixTimestampMillis, n: number): void {
    console.log(`#${n} after ${_since(started)}`)
  }
}

const inst = new C()
const fn = (started: UnixTimestampMillis, n: number): void => inst.fn(started, n)

async function startTimer(fn: AnyFunction, interval: number, count: number): Promise<void> {
  const started = Date.now()

  for (let i = 0; i < count; i++) {
    await pDelay(interval)
    fn(started, i + 1)
  }

  await pDelay(1000) // extra wait
}

test('@debounce', async () => {
  await startTimer(fn, 10, 10)
})

describe('@_AsyncDebounce', () => {
  test('should coalesce calls and resolve every caller with a real result (never undefined)', async () => {
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
  test('should invoke on the leading edge immediately', async () => {
    class C {
      calls = 0

      @_AsyncThrottle(50)
      async ping(n: number): Promise<number> {
        this.calls++
        return n
      }
    }

    const inst = new C()
    expect(await inst.ping(7)).toBe(7)
    expect(inst.calls).toBe(1)
  })
})
