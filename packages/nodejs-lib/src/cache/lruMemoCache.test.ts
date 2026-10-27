import { _AsyncMemo } from '@naturalcycles/js-lib/decorators/asyncMemo.decorator.js'
import { _Memo } from '@naturalcycles/js-lib/decorators/memo.decorator.js'
import { expect, it, vi } from 'vitest'
import { LRUAsyncMemoCache, LRUMemoCache } from './lruMemoCache.js'

class A {
  func(n: number): void {
    console.log(`func ${n}`)
  }

  @_Memo({ cacheFactory: () => new LRUMemoCache({ ttl: 100, max: 100 }) })
  a(a1: number, a2: number): number {
    const n = a1 * a2
    this.func(n)
    return n
  }
}

it('should call the memoized method once per argument set with LRUMemoCache', () => {
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
})

class B {
  calls = 0

  @_AsyncMemo({ cacheFactory: () => new LRUAsyncMemoCache({ max: 100 }) })
  async square(n: number): Promise<number> {
    this.calls++
    return n * n
  }

  @_AsyncMemo({ cacheFactory: () => new LRUAsyncMemoCache({ max: 100 }) })
  async nothing(_n: number): Promise<undefined> {
    this.calls++
    return undefined
  }
}

it('should call the async method on a miss and cache the result with LRUAsyncMemoCache', async () => {
  const b = new B()

  expect(await b.square(3)).toBe(9)
  expect(await b.square(3)).toBe(9)
  expect(b.calls).toBe(1)
})

it('should return a cached undefined as a hit with LRUAsyncMemoCache', async () => {
  const b = new B()

  expect(await b.nothing(1)).toBeUndefined()
  expect(await b.nothing(1)).toBeUndefined()
  expect(b.calls).toBe(1)
})
