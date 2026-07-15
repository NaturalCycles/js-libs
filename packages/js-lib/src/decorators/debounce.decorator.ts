import type { AnyAsyncFunction, AnyFunction } from '../types.js'
import type { DebounceOptions, ThrottleOptions } from './debounce.js'
import { _asyncDebounce, _asyncThrottle, _debounce, _throttle } from './debounce.js'
import type { MethodDecorator } from './decorator.util.js'

export function _Debounce<T extends AnyFunction>(
  wait: number,
  opt: DebounceOptions = {},
): MethodDecorator<T> {
  return (_target, _key, descriptor) => {
    const originalFn = descriptor.value!
    descriptor.value = _debounce<T>(originalFn, wait, opt)
    return descriptor
  }
}

export function _Throttle<T extends AnyFunction>(
  wait: number,
  opt: ThrottleOptions = {},
): MethodDecorator<T> {
  return (_target, _key, descriptor) => {
    const originalFn = descriptor.value!
    descriptor.value = _throttle<T>(originalFn, wait, opt)
    return descriptor
  }
}

/**
 * Like `@_Debounce`, but for async methods. Guarantees every call returns a real Promise that
 * resolves (or rejects) with the coalesced invocation's result, so the declared `Promise<T>` return
 * type stays accurate. Unlike `@_Debounce`, `await`-ing a decorated method never silently yields
 * `undefined`.
 *
 * @experimental
 */
export function _AsyncDebounce<T extends AnyAsyncFunction>(
  wait: number,
  opt: DebounceOptions = {},
): MethodDecorator<T> {
  return (_target, _key, descriptor) => {
    const originalFn = descriptor.value!
    descriptor.value = _asyncDebounce<T>(originalFn, wait, opt)
    return descriptor
  }
}

/**
 * Like `@_Throttle`, but for async methods. See `@_AsyncDebounce` for the Promise semantics.
 *
 * @experimental
 */
export function _AsyncThrottle<T extends AnyAsyncFunction>(
  wait: number,
  opt: ThrottleOptions = {},
): MethodDecorator<T> {
  return (_target, _key, descriptor) => {
    const originalFn = descriptor.value!
    descriptor.value = _asyncThrottle<T>(originalFn, wait, opt)
    return descriptor
  }
}
