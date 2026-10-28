import { expect, it, vi } from 'vitest'
import { _range } from '../array/range.js'
import { pDelay } from '../promise/pDelay.js'
import { _AsyncMemo, _getAsyncMemo } from './asyncMemo.decorator.js'
import { MapAsyncMemoCache } from './memo.util.js'

class A {
  func(n: number): void {
    console.log(`func ${n}`)
  }

  @_AsyncMemo({ cacheFactory: () => new MapAsyncMemoCache() })
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

class C {
  calls = 0

  @_AsyncMemo({
    cacheFactory: () => new MapAsyncMemoCache(10),
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
