import { expect, it, vi } from 'vitest'
import { _range } from '../array/range.js'
import { commonLoggerNoop } from '../log/commonLogger.js'
import type { CommonLogFunction, CommonLogger } from '../log/commonLogger.js'
import { pDelay } from '../promise/pDelay.js'
import { MISS } from '../types.js'
import { _AsyncMemo, _getAsyncMemo } from './asyncMemo.decorator.js'
import type { AsyncMemoCache } from './memo.util.js'
import { MapAsyncMemoCache } from './memo.util.js'

class A {
  func(n: number): void {
    console.log(`func ${n}`)
  }

  @_AsyncMemo() // default cacheFactory: MapAsyncMemoCache
  async a(a1: number, a2: number): Promise<number> {
    const n = a1 * a2
    this.func(n)
    return n
  }
}

it('should call the method once per set of arguments', async () => {
  const a = new A()
  vi.spyOn(a, 'func').mockImplementation(() => {})

  // first call
  let r = await a.a(2, 3)
  expect(r).toBe(6)
  r = await a.a(3, 4)
  expect(r).toBe(12)

  // second call
  r = await a.a(2, 3)
  expect(r).toBe(6)
  r = await a.a(3, 4)
  expect(r).toBe(12)

  // to be called once per set of arguments (2)
  expect(a.func).toHaveBeenCalledTimes(2)
  expect(a.func).toHaveBeenNthCalledWith(1, 6)
  expect(a.func).toHaveBeenNthCalledWith(2, 12)

  expect(_getAsyncMemo(a.a).getCache(a)).toBeInstanceOf(MapAsyncMemoCache)

  // cleanup for the next tests
  await _getAsyncMemo(a.a).clear()
})

it('should call the method again after the cache is cleared', async () => {
  const a = new A()
  vi.spyOn(a, 'func').mockImplementation(() => {})

  // first call
  await a.a(2, 3)

  // drop cache
  await _getAsyncMemo(a.a).clear()
  expect(_getAsyncMemo(a.a).getInstanceCache().size).toBe(0)

  // second call
  await a.a(2, 3)

  expect(a.func).toHaveBeenCalledTimes(2)
})

class B {
  cacheMisses = 0

  @_AsyncMemo({ cacheFactory: () => new MapAsyncMemoCache() }) // testing 2 layers of AsyncMemo!
  @_AsyncMemo({
    // testing to provide specific cacheFactory, should be no difference in this test
    cacheFactory: () => new MapAsyncMemoCache(),
  })
  async a(a1 = 'def'): Promise<number> {
    console.log(`a called with a1=${a1}`)
    this.cacheMisses++
    return 1 // it cannot return undefined, otherwise it'll always MISS
  }
}

it('should cache a call with default args apart from one passing the default explicitly', async () => {
  const b = new B()

  // Call 1 with default (cache miss). arg1=undefined
  await b.a()

  // Call 2 with default (cache hit). arg1=undefined
  await b.a()

  // Call 3 with same as default (cache miss). arg1=def
  await b.a('def')

  // Call 4 with non-default (cache miss). arg1=nondef
  await b.a('nondef')

  expect(b.cacheMisses).toBe(3)
})

/**
 * Simulates the latency of an async backed cache (Redis, Datastore),
 * so that parallel callers arrive while the cache lookup is still pending.
 */
class SlowAsyncMemoCache extends MapAsyncMemoCache {
  override async get(k: any): Promise<any> {
    await pDelay(10)
    return await super.get(k)
  }

  override async set(k: any, v: any): Promise<void> {
    await pDelay(10)
    await super.set(k, v)
  }
}

class C {
  calls = 0

  @_AsyncMemo({
    cacheFactory: () => new SlowAsyncMemoCache(),
  })
  async fn(): Promise<void> {
    this.calls++
    await pDelay(100)
  }
}

it('should call the method once for parallel calls and serve later calls from the cache', async () => {
  // Swarm is when one "slow" async function is called multiple times in parallel
  // Expectation is that it should return the same Promise and `calls` should equal to 1
  // Because it **synchronously** returns a Promise (despite the fact that it's async)
  const c = new C()

  await Promise.all(_range(10).map(() => c.fn()))

  expect(c.calls).toBe(1)

  await pDelay(150)
  await Promise.all(_range(3).map(() => c.fn()))
  expect(c.calls).toBe(1)
})

class D {
  calls = 0

  @_AsyncMemo()
  async failOnce(): Promise<string> {
    this.calls++
    await pDelay(10)
    if (this.calls === 1) throw new Error('first call fails')
    return 'ok'
  }
}

it('should not cache a rejection, so the next call retries the method', async () => {
  const d = new D()

  // parallel callers share the one in-flight call, so they all get its rejection
  const results = await Promise.allSettled(_range(3).map(() => d.failOnce()))
  expect(results.map(r => r.status)).toEqual(['rejected', 'rejected', 'rejected'])
  expect(d.calls).toBe(1)

  // the rejection was not cached: miss, the method is called again
  expect(await d.failOnce()).toBe('ok')
  // hit
  expect(await d.failOnce()).toBe('ok')
  expect(d.calls).toBe(2)
})

class BrokenAsyncMemoCache implements AsyncMemoCache {
  async get(): Promise<never> {
    throw new Error('cache get failed')
  }

  async set(): Promise<never> {
    throw new Error('cache set failed')
  }

  async delete(): Promise<void> {}

  async clear(): Promise<void> {}
}

const error = vi.fn<CommonLogFunction>()
const logger: CommonLogger = { ...commonLoggerNoop, error }

class E {
  calls = 0

  @_AsyncMemo({ cacheFactory: () => new BrokenAsyncMemoCache(), logger })
  async fn(): Promise<string> {
    this.calls++
    return 'ok'
  }
}

it('should log cache errors and treat them as a miss, never failing the method', async () => {
  const e = new E()

  expect(await e.fn()).toBe('ok')
  await pDelay(0) // let the background cache `set` settle
  expect(error.mock.calls.map(([input]) => (input as { err: Error }).err.message)).toEqual([
    'cache get failed',
    'cache set failed',
  ])

  // nothing could be cached, so the method is called again
  expect(await e.fn()).toBe('ok')
  expect(e.calls).toBe(2)
})

it('should delete one key from MapAsyncMemoCache', async () => {
  const cache = new MapAsyncMemoCache<string, number>()
  await cache.set('a', 1)
  await cache.set('b', 2)

  await cache.delete('a')

  expect(await cache.get('a')).toBe(MISS)
  expect(await cache.get('b')).toBe(2)
})
