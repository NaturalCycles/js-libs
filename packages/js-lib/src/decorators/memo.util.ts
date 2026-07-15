import { _isPrimitive } from '../is.util.js'
import { pDelay } from '../promise/pDelay.js'
import type { UnixTimestamp } from '../types.js'
import { MISS } from '../types.js'

export type MemoSerializer = (args: any[]) => any

export const jsonMemoSerializer: MemoSerializer = args => {
  if (args.length === 0) return undefined
  if (args.length === 1 && _isPrimitive(args[0])) return args[0]
  return JSON.stringify(args)
}

export interface MemoCacheOptions {
  /**
   * If set (and if it's implemented by the driver) - will set expiry TTL for each key of the batch.
   * E.g EXAT in Redis.
   */
  expireAt?: UnixTimestamp
}

export interface MemoCache<KEY = any, VALUE = any> {
  has: (k: KEY) => boolean
  /**
   * `get` return signature doesn't contain `undefined`,
   * because `undefined` is a valid VALUE to store in the Cache.
   * `undefined` does NOT mean cache miss.
   * Cache misses are checked by calling `has` method instead.
   */
  get: (k: KEY) => VALUE
  set: (k: KEY, v: VALUE, opt?: MemoCacheOptions) => void

  /**
   * Clear is only called when `_getMemoCache().clear()` is called.
   * Otherwise the Cache is "persistent" (never cleared).
   */
  clear: () => void
}

export interface AsyncMemoCache<KEY = any, VALUE = any> {
  // `has` method is removed, because it is assumed that it has a cost and it's best to avoid doing both `has` and then `get`
  // has(k: any): Promise<boolean>
  /**
   * MISS symbol indicates the ABSENCE of value in the Cache.
   * You can safely store `undefined` or `null` values in the Cache,
   * they will not be interpreted as a cache miss, because there is a special MISS symbol for that.
   */
  get: (k: KEY) => Promise<VALUE | typeof MISS>
  set: (k: KEY, v: VALUE, opt?: MemoCacheOptions) => Promise<void>

  /**
   * Clear is only called when `_getAsyncMemo().clear()` is called.
   * Otherwise the Cache is "persistent" (never cleared).
   */
  clear: () => Promise<void>
}

// SingleValueMemoCache and ObjectMemoCache are example-only, not used in production code
/*
export class SingleValueMemoCache implements MemoCache {
  private v: any = undefined
  private valueSet = false

  has() {
    return this.valueSet
  }

  get() {
    return this.v
  }

  set(_k: any, _v: any) {
    this.v = _v
    this.valueSet = true
  }

  clear() {
    this.valueSet = false
  }
}

export class ObjectMemoCache implements MemoCache {
  private v = {}

  has(k: any) {
    return k in this.v
    // return this.v[k]
  }

  get(k: any) {
    return this.v[k]
  }

  set(k: any, v: any) {
    this.v[k] = v
  }

  clear() {
    this.v = {}
  }
}
 */

export class MapMemoCache<KEY = any, VALUE = any> implements MemoCache<KEY, VALUE> {
  private m = new Map<KEY, VALUE>()

  has(k: KEY): boolean {
    return this.m.has(k)
  }

  get(k: KEY): VALUE {
    return this.m.get(k)!
  }

  set(k: KEY, v: VALUE): void {
    this.m.set(k, v)
  }

  clear(): void {
    this.m.clear()
  }
}

/**
 * Implementation of AsyncMemoCache backed by a synchronous Map.
 * Doesn't have a practical use except testing,
 * because the point of AsyncMemoCache is to have an **async** backed cache.
 */
export class MapAsyncMemoCache<KEY = any, VALUE = any> implements AsyncMemoCache<KEY, VALUE> {
  constructor(private delay = 0) {}

  private m = new Map<KEY, VALUE>()

  async get(k: KEY): Promise<VALUE | typeof MISS> {
    await pDelay(this.delay)
    if (!this.m.has(k)) return MISS
    return this.m.get(k)!
  }

  async set(k: KEY, v: VALUE): Promise<void> {
    await pDelay(this.delay)
    this.m.set(k, v)
  }

  async clear(): Promise<void> {
    await pDelay(this.delay)
    this.m.clear()
  }
}
