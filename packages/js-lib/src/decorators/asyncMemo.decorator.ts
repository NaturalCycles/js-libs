import { _assert, _assertTypeOf } from '../error/assert.js'
import type { CommonLogger } from '../log/commonLogger.js'
import type { AnyAsyncFunction, AnyFunction, AnyObject, MaybeParameters } from '../types.js'
import { _objectAssign, MISS } from '../types.js'
import { _getTargetMethodSignature } from './decorator.util.js'
import type { AsyncMemoCache, MethodDecorator } from './memo.util.js'
import { jsonMemoSerializer } from './memo.util.js'

export interface AsyncMemoOptions<FN> {
  /**
   * Provide a custom implementation of AsyncMemoCache.
   * Function that creates an instance of `AsyncMemoCache`.
   */
  cacheFactory: () => AsyncMemoCache

  /**
   * Provide a custom implementation of CacheKey function.
   */
  cacheKeyFn?: (args: MaybeParameters<FN>) => any

  /**
   * Default to `console`
   */
  logger?: CommonLogger
}

export interface AsyncMemoInstance {
  /**
   * Clears the cache.
   */
  clear: () => Promise<void>

  getInstanceCache: () => Map<AnyObject, AsyncMemoCache>

  getCache: (instance: AnyAsyncFunction) => AsyncMemoCache | undefined
}

/**
 * Like `@_Memo`, but allowing async MemoCache implementation.
 *
 * Implementation is more complex than `@_Memo`, because it needs to handle "in-flight" Promises
 * while waiting for cache to resolve, to prevent "async swarm" issue.
 *
 * @experimental consider normal `@_Memo` for most of the cases, it's stable and predictable
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const _AsyncMemo =
  <FN>(opt: AsyncMemoOptions<FN>): MethodDecorator<FN> =>
  (target, key, descriptor) => {
    _assertTypeOf<AnyFunction>(
      descriptor.value,
      'function',
      'Memoization can be applied only to methods',
    )

    const originalFn = descriptor.value

    // Map from "instance" of the Class where @_AsyncMemo is applied to AsyncMemoCache instance.
    const instanceCache = new Map<AnyObject, AsyncMemoCache>()

    // Cache from Instance to Map<key, Promise>
    // This cache is temporary, with only one purpose - to prevent "async swarm"
    // It only holds values that are "in-flight", until Promise is resolved
    // After it's resolved - it's evicted from the cache and moved to the "proper" `instanceCache`
    const instancePromiseCache = new Map<AnyObject, Map<any, Promise<any>>>()

    const { logger = console, cacheFactory, cacheKeyFn = jsonMemoSerializer } = opt

    const keyStr = String(key)
    const methodSignature = _getTargetMethodSignature(target, keyStr)

    // oxlint-disable-next-line @typescript-eslint/promise-function-async
    descriptor.value = function (this: typeof target, ...args: MaybeParameters<FN>): Promise<any> {
      const ctx = this
      const cacheKey = cacheKeyFn(args)

      let cache = instanceCache.get(ctx)
      let promiseCache = instancePromiseCache.get(ctx)

      if (!cache) {
        cache = cacheFactory()
        instanceCache.set(ctx, cache)
        // here, no need to check the cache. It's definitely a miss, because the cacheLayers is just created
        // UPD: no! AsyncMemo supports "persistent caches" (e.g Database-backed cache)
      }
      if (!promiseCache) {
        promiseCache = new Map()
        instancePromiseCache.set(ctx, promiseCache)
      }

      let promise = promiseCache.get(cacheKey)
      // If there's already "in-flight" cache request - return that, to avoid "async swarm"
      if (promise) {
        // console.log('return promise', promiseCache.size)
        return promise
      }

      promise = cache.get(cacheKey).then(
        async value => {
          if (value !== MISS) {
            // console.log('hit', promiseCache.size)
            promiseCache.delete(cacheKey)
            return value
          }

          // Miss
          // console.log('miss', promiseCache.size)
          return await onMiss()
        },
        async err => {
          // Log the cache error and proceed "as cache Miss"
          logger.error(err)
          return await onMiss()
        },
      )

      promiseCache.set(cacheKey, promise)
      return promise

      //

      async function onMiss(): Promise<any> {
        try {
          const value = await originalFn.apply(ctx, args)

          // Save the value in the Cache, in parallel,
          // not to slow down the main function execution
          // and not to fail on possible cache issues
          void (async () => {
            try {
              await cache!.set(cacheKey, value)
            } catch (err) {
              logger.error(err) // log and ignore the error
            } finally {
              // Clear the "in-flight" promise cache entry, as we now have a "permanent" cache entry
              promiseCache!.delete(cacheKey)
              // console.log('cache set and cleared', promiseCache!.size)
            }
          })()

          return value
        } catch (err) {
          promiseCache!.delete(cacheKey)
          throw err
        }
      }
    } as any

    _objectAssign(descriptor.value as AsyncMemoInstance, {
      clear: async () => {
        logger.log(`${methodSignature} @_AsyncMemo.clear()`)
        await Promise.all([...instanceCache.values()].map(c => c.clear()))
        instanceCache.clear()
      },
      getInstanceCache: () => instanceCache,
      getCache: instance => instanceCache.get(instance),
    })

    return descriptor
  }

/**
 Call it on a method that is decorated with `@_AsyncMemo` to get access to additional functions,
 e.g `clear` to clear the cache, or get its underlying data.
 */
export function _getAsyncMemo(method: AnyFunction): AsyncMemoInstance {
  _assert(
    typeof (method as any)?.getInstanceCache === 'function',
    'method is not an AsyncMemo instance',
  )
  return method as any
}
