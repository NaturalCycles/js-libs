import type { AsyncMemoCache, MemoCache } from '@naturalcycles/js-lib/decorators'
import { MISS } from '@naturalcycles/js-lib/types'
import { LRUCache } from 'lru-cache'

// Partial, to be able to provide default `max`
export type LRUMemoCacheOptions<KEY, VALUE> = Partial<LRUCache.Options<KEY, VALUE, any>>

/**
 * @example
 * Use it like this:
 *
 * `@_Memo({ cacheFactory: () => new LRUMemoCache({...}) })`
 * method1 ()
 */
export class LRUMemoCache<KEY = any, VALUE = any> implements MemoCache<KEY, VALUE> {
  constructor(opt: LRUMemoCacheOptions<KEY, VALUE>) {
    this.lru = new LRUCache<any, any>({
      max: 100,
      ...opt,
    })
  }

  private lru!: LRUCache<any, any>

  has(k: any): boolean {
    return this.lru.has(k)
  }

  get(k: any): any {
    return this.lru.get(k)
  }

  set(k: any, v: any): void {
    this.lru.set(k, v)
  }

  clear(): void {
    this.lru.clear()
  }
}

// lru-cache never stores `undefined` (`set(k, undefined)` deletes `k`), so it's stored as this sentinel
const UNDEFINED = Symbol('undefined')

/**
 * Same as LRUMemoCache, but implements AsyncMemoCache interface, for when you need it.
 */
export class LRUAsyncMemoCache<KEY = any, VALUE = any> implements AsyncMemoCache<KEY, VALUE> {
  constructor(opt: LRUMemoCacheOptions<KEY, VALUE>) {
    this.lru = new LRUCache<any, any>({
      max: 100,
      ...opt,
    })
  }

  private lru!: LRUCache<any, any>

  async has(k: any): Promise<boolean> {
    return this.lru.has(k)
  }

  async get(k: any): Promise<VALUE | typeof MISS> {
    const v = this.lru.get(k)
    if (v === undefined) return MISS
    return v === UNDEFINED ? (undefined as VALUE) : v
  }

  async set(k: any, v: any): Promise<void> {
    this.lru.set(k, v === undefined ? UNDEFINED : v)
  }

  async clear(): Promise<void> {
    this.lru.clear()
  }
}
