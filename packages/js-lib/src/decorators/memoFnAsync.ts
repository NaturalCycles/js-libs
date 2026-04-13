import type { AnyAsyncFunction, MaybeParameters } from '../types.js'
import { MISS } from '../types.js'
import type { AsyncMemoOptions } from './asyncMemo.decorator.js'
import type { AsyncMemoCache } from './memo.util.js'
import { jsonMemoSerializer } from './memo.util.js'

export interface MemoizedAsyncFunction {
  cache: AsyncMemoCache
}

/**
 * @experimental
 */
export function _memoFnAsync<FN extends AnyAsyncFunction>(
  fn: FN,
  opt: AsyncMemoOptions<FN>,
): FN & MemoizedAsyncFunction {
  const { logger = console, cacheFactory, cacheKeyFn = jsonMemoSerializer } = opt

  const cache = cacheFactory()

  const memoizedFn = async function (this: any, ...args: MaybeParameters<FN>): Promise<any> {
    const ctx = this
    const cacheKey = cacheKeyFn(args)
    let value: any

    try {
      value = await cache.get(cacheKey)
    } catch (err) {
      logger.error(err)
    }

    if (value !== MISS) {
      return value
    }

    value = await fn.apply(ctx, args)

    void (async () => {
      try {
        await cache.set(cacheKey, value)
      } catch (err) {
        logger.error(err)
      }
    })()

    return value
  }

  Object.assign(memoizedFn, { cache })
  return memoizedFn as FN & MemoizedAsyncFunction
}
