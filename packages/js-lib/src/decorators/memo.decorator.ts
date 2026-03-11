import { _assert, _assertTypeOf } from '../error/assert.js'
import type { CommonLogger } from '../log/commonLogger.js'
import type { AnyFunction, AnyObject, MaybeParameters } from '../types.js'
import { _objectAssign } from '../types.js'
import { _getTargetMethodSignature } from './decorator.util.js'
import type { MemoCache, MethodDecorator } from './memo.util.js'
import { jsonMemoSerializer, MapMemoCache } from './memo.util.js'

export interface MemoOptions<FN> {
  /**
   * Provide a custom implementation of MemoCache.
   * Function that creates an instance of `MemoCache`.
   * e.g LRUMemoCache from `@naturalcycles/nodejs-lib`
   */
  cacheFactory?: () => MemoCache

  /**
   * Provide a custom implementation of CacheKey function.
   */
  cacheKeyFn?: (args: MaybeParameters<FN>) => any

  /**
   * Default to `console`
   */
  logger?: CommonLogger
}

export interface MemoInstance {
  /**
   * Clears the cache.
   */
  clear: () => void

  getInstanceCache: () => Map<AnyObject, MemoCache>

  getCache: (instance: AnyFunction) => MemoCache | undefined
}

/**
 * Memoizes the method of the class, so it caches the output and returns the cached version if the "key"
 * of the cache is the same. Key, by defaul, is calculated as `JSON.stringify(...args)`.
 * Cache is stored indefinitely in the internal Map.
 *
 * If origin function throws an Error - it is NOT cached.
 * So, error-throwing functions will be called multiple times.
 * Therefor, if the origin function can possibly throw - it should try to be idempotent.
 *
 * Cache is stored **per instance** - separate cache for separate instances of the class.
 * If you don't want it that way - you can use a static method, then there will be only one "instance".
 *
 * Supports dropping it's cache by calling .clear() method of decorated function (useful in unit testing).
 *
 * Based on:
 * https://github.com/mgechev/memo-decorator/blob/master/index.ts
 * http://decodize.com/blog/2012/08/27/javascript-memoization-caching-results-for-better-performance/
 * http://inlehmansterms.net/2015/03/01/javascript-memoization/
 * https://community.risingstack.com/the-worlds-fastest-javascript-memoization-library/
 */
export const _Memo =
  <FN>(opt: MemoOptions<FN> = {}): MethodDecorator<FN> =>
  (target, key, descriptor) => {
    _assertTypeOf<AnyFunction>(
      descriptor.value,
      'function',
      'Memoization can be applied only to methods',
    )

    const originalFn = descriptor.value

    // Map<ctx => MemoCache<cacheKey, result>>
    //
    // Internal map is from cacheKey to result
    // External map (instanceCache) is from ctx (instance of class) to Internal map
    // External map is Weak to not cause memory leaks, to allow ctx objects to be garbage collected
    // UPD: tests show that normal Map also doesn't leak (to be tested further)
    // Normal Map is needed to allow .clear()
    const instanceCache = new Map<AnyObject, MemoCache>()

    const {
      logger = console,
      cacheFactory = () => new MapMemoCache(),
      cacheKeyFn = jsonMemoSerializer,
    } = opt

    const keyStr = String(key)
    const methodSignature = _getTargetMethodSignature(target, keyStr)

    descriptor.value = function (this: typeof target, ...args: MaybeParameters<FN>): any {
      const ctx = this
      const cacheKey = cacheKeyFn(args)

      let cache = instanceCache.get(ctx)
      if (!cache) {
        cache = cacheFactory()
        instanceCache.set(ctx, cache)
      }

      if (cache.has(cacheKey)) {
        // Hit
        return cache.get(cacheKey)
      }

      // Miss
      const value = originalFn.apply(ctx, args)

      try {
        cache.set(cacheKey, value)
      } catch (err) {
        logger.error(err)
      }

      return value
    } as any

    _objectAssign(descriptor.value as MemoInstance, {
      clear: () => {
        logger.log(`${methodSignature} @_Memo.clear()`)
        instanceCache.forEach(memoCache => memoCache.clear())
        instanceCache.clear()
      },
      getInstanceCache: () => instanceCache,
      getCache: instance => instanceCache.get(instance),
    })

    return descriptor
  }

/**
 Call it on a method that is decorated with `@_Memo` to get access to additional functions,
 e.g `clear` to clear the cache, or get its underlying data.
 */
export function _getMemo(method: AnyFunction): MemoInstance {
  _assert(typeof (method as any)?.getInstanceCache === 'function', 'method is not a Memo instance')
  return method as any
}
