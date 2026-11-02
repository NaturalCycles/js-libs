import { consoleLogger } from '../log/commonLogger.js'
import type { AnyAsyncFunction, MaybeParameters } from '../types.js'
import { MISS } from '../types.js'
import type { AsyncMemoOptions } from './asyncMemo.decorator.js'
import type { AsyncMemoCache } from './memo.util.js'
import { jsonMemoSerializer, MapAsyncMemoCache } from './memo.util.js'

export interface MemoizedAsyncFunction {
  cache: AsyncMemoCache
}

/**
 * Function version of `@_AsyncMemo`: awaits `fn` and caches the resolved value, not the Promise,
 * so a rejection is not cached. Cache errors are logged and treated as a miss.
 *
 * Unlike the decorator, it does NOT dedupe parallel calls with the same key.
 */
export function _memoizedAsync<FN extends AnyAsyncFunction>(
  fn: FN,
  opt: AsyncMemoOptions<FN> = {},
): FN & MemoizedAsyncFunction {
  const {
    logger = consoleLogger,
    cacheFactory = () => new MapAsyncMemoCache(),
    cacheKeyFn = jsonMemoSerializer,
  } = opt

  const cache = cacheFactory()

  const memoizedFn = async function (this: any, ...args: MaybeParameters<FN>): Promise<any> {
    const ctx = this
    const cacheKey = cacheKeyFn(args)
    // MISS, so that a failed cache `get` is a miss too (and not a cached `undefined`)
    let value: any = MISS

    try {
      value = await cache.get(cacheKey)
    } catch (err) {
      logger.error({ err })
    }

    if (value !== MISS) {
      return value
    }

    value = await fn.apply(ctx, args)

    void (async () => {
      try {
        await cache.set(cacheKey, value)
      } catch (err) {
        logger.error({ err })
      }
    })()

    return value
  }

  Object.assign(memoizedFn, { cache })
  return memoizedFn as FN & MemoizedAsyncFunction
}
