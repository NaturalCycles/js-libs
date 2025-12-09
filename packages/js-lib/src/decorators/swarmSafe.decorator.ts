import type { AnyObject } from '../types.js'
import { _getTargetMethodSignature } from './decorator.util.js'

/**
 * Prevents "swarm" of async calls to the same method.
 * Allows max 1 in-flight promise to exist.
 * If more calls appear, while Promise is not resolved yet - same Promise is returned.
 *
 * Does not support `cacheKey`.
 * So, the same Promise is returned, regardless of the arguments.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const _SwarmSafe = (): MethodDecorator => (target, key, descriptor) => {
  if (typeof descriptor.value !== 'function') {
    throw new TypeError('@_SwarmSafe can be applied only to methods')
  }

  const originalFn = descriptor.value
  const keyStr = String(key)
  const methodSignature = _getTargetMethodSignature(target, keyStr)
  const instanceCache = new Map<AnyObject, Promise<any>>()

  console.log('SwarmSafe constructor called', { key, methodSignature })

  // oxlint-disable-next-line @typescript-eslint/promise-function-async
  descriptor.value = function (this: typeof target, ...args: any[]): Promise<any> {
    console.log('SwarmSafe method called', { key, methodSignature, args })
    const ctx = this

    let inFlightPromise = instanceCache.get(ctx)
    if (inFlightPromise) {
      console.log(`SwarmSafe: returning in-flight promise`)
      return inFlightPromise
    }

    console.log(`SwarmSafe: first-time call, creating in-flight promise`)

    inFlightPromise = originalFn.apply(ctx, args) as Promise<any>
    instanceCache.set(ctx, inFlightPromise)
    void inFlightPromise.finally(() => {
      console.log(`SwarmSafe: in-flight promise resolved`)
      instanceCache.delete(ctx)
    })

    return inFlightPromise
  } as any
}
