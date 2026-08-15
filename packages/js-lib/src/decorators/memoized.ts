import type { AnyFunction, MaybeParameters } from '../types.js'
import type { MemoOptions } from './memo.decorator.js'
import type { MemoCache } from './memo.util.js'
import { jsonMemoSerializer, MapMemoCache } from './memo.util.js'

export interface MemoizedFunction {
  cache: MemoCache
}

/**
 * Only supports Sync functions.
 * To support Async functions - use _memoFnAsync.
 * Technically, you can use it with Async functions, but it'll return the Promise without awaiting it.
 */
export function _memoized<FN extends AnyFunction>(
  fn: FN,
  opt: MemoOptions<FN> = {},
): FN & MemoizedFunction {
  const {
    logger = console,
    cacheFactory = () => new MapMemoCache(),
    cacheKeyFn = jsonMemoSerializer,
  } = opt

  const cache = cacheFactory()

  const memoizedFn = function (this: any, ...args: MaybeParameters<FN>): FN {
    const ctx = this
    const cacheKey = cacheKeyFn(args)

    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)
    }

    const value = fn.apply(ctx, args)

    try {
      cache.set(cacheKey, value)
    } catch (err) {
      logger.error(err)
    }

    return value
  }

  Object.assign(memoizedFn, { cache })
  return memoizedFn as FN & MemoizedFunction
}
