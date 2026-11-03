import { expect, it, vi } from 'vitest'
import { _range } from '../array/range.js'
import { pDelay } from '../promise/pDelay.js'
import { _getMemo, _Memo } from './memo.decorator.js'

class A {
  func(n: number): void {
    console.log(`func ${n}`)
  }

  @_Memo()
  a(a1: number, a2: number): number {
    const n = a1 * a2
    this.func(n)
    return n
  }
}

it('should call the method once per set of arguments and clear the instance cache', () => {
  const a = new A()
  vi.spyOn(a, 'func').mockImplementation(() => {})

  // first call
  let r = a.a(2, 3)
  expect(r).toBe(6)
  r = a.a(3, 4)
  expect(r).toBe(12)

  // second call
  r = a.a(2, 3)
  expect(r).toBe(6)
  r = a.a(3, 4)
  expect(r).toBe(12)

  // to be called once per set of arguments (2)
  expect(a.func).toHaveBeenCalledTimes(2)
  expect(a.func).toHaveBeenNthCalledWith(1, 6)
  expect(a.func).toHaveBeenNthCalledWith(2, 12)

  expect(_getMemo(a.a).getInstanceCache().size).toBe(1)

  // cleanup for the next tests
  _getMemo(a.a).clear()

  expect(_getMemo(a.a).getInstanceCache().size).toBe(0)
})

it('should call the method again after the cache is cleared', () => {
  const a = new A()
  vi.spyOn(a, 'func').mockImplementation(() => {})

  // first call
  a.a(2, 3)

  _getMemo(a.a).clear()

  // second call
  a.a(2, 3)

  expect(a.func).toHaveBeenCalledTimes(2)
})

it('should throw when applied to a non-method', () => {
  const pd = { value: 'property' } as PropertyDescriptor
  expect(() => _Memo()(null as any, 'a', pd)).toThrowErrorMatchingInlineSnapshot(
    `[AssertionError: Memoization can be applied only to methods]`,
  )
})

class B {
  cacheMisses = 0

  @_Memo()
  a(a1 = 'def'): void {
    console.log(`a called with a1=${a1}`)
    this.cacheMisses++
  }
}

it('should cache a call with default args apart from one passing the default explicitly', () => {
  const b = new B()

  // Call 1 with default (cache miss). arg1=undefined
  b.a()

  // Call 2 with default (cache hit). arg1=undefined
  b.a()

  // Call 3 with same as default (cache miss). arg1=def
  b.a('def')

  // Call 4 with non-default (cache miss). arg1=nondef
  b.a('nondef')

  expect(b.cacheMisses).toBe(3)
})

class C {
  calls = 0

  @_Memo()
  async fn(): Promise<void> {
    this.calls++
    await pDelay(100)
  }
}

it('should call an async method once for parallel calls', async () => {
  // Swarm is when one "slow" async function is called multiple times in parallel
  // Expectation is that it should return the same Promise and `calls` should equal to 1
  // Because it **synchronously** returns a Promise (despite the fact that it's async)
  const c = new C()

  await Promise.all(_range(10).map(() => c.fn()))

  expect(c.calls).toBe(1)
})

class D {
  calls = 0

  @_Memo()
  async failOnce(): Promise<string> {
    if (++this.calls === 1) throw new Error('fail')
    return 'ok'
  }
}

it('should not cache a rejected Promise by default, so the next call retries the method', async () => {
  const d = new D()

  // Parallel callers share the in-flight Promise, so they all get the rejection
  const results = await Promise.allSettled(_range(3).map(() => d.failOnce()))
  expect(results.map(r => r.status)).toEqual(['rejected', 'rejected', 'rejected'])
  expect(d.calls).toBe(1)

  // The rejection was evicted: the method is retried, and the resolved Promise is cached
  expect(await d.failOnce()).toBe('ok')
  expect(await d.failOnce()).toBe('ok')
  expect(d.calls).toBe(2)
})

class E {
  calls = 0

  @_Memo()
  async fn(): Promise<number> {
    const call = ++this.calls
    await pDelay(10)
    if (call === 1) throw new Error('fail')
    return call
  }

  @_Memo()
  throwOnce(): string {
    if (++this.calls === 1) throw new Error('fail')
    return 'ok'
  }
}

it('should only evict the rejected Promise, not a newer one cached under the same key', async () => {
  const e = new E()

  const p1 = e.fn() // call 1, rejects
  _getMemo(e.fn).getCache(e)!.clear() // e.g a ttl expiry
  const p2 = e.fn() // call 2, resolves, cached under the same key

  await expect(p1).rejects.toThrow('fail')
  expect(e.fn()).toBe(p2) // p2 is still cached
  expect(await p2).toBe(2)
  expect(e.calls).toBe(2)
})

it('should not cache a sync Error either, so the next call retries the method', () => {
  // The throw escapes before `cache.set`, so there is nothing to evict
  const e = new E()

  expect(() => e.throwOnce()).toThrow('fail')
  expect(e.throwOnce()).toBe('ok')
  expect(e.throwOnce()).toBe('ok')
  expect(e.calls).toBe(2)
})
