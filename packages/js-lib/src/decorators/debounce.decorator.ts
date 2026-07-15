import type { AnyAsyncFunction, AnyFunction } from '../types.js'
import type {
  AsyncDebounceOptions,
  AsyncThrottleOptions,
  DebounceOptions,
  ThrottleOptions,
} from './debounce.js'
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
 * Like `@_Debounce`, but for async methods: every call returns a real Promise resolving with the
 * coalesced invocation's result, so `await`-ing never yields a stale value or a non-promise
 *
 * Be aware that the decorated method may resolve `undefined` if the config yields no invocation,
 * which the method's `T` type can't express.
 *
 * @experimental
 */
export function _AsyncDebounce<T extends AnyAsyncFunction>(
  wait: number,
  opt: AsyncDebounceOptions = {},
): MethodDecorator<T> {
  return (_target, _key, descriptor) => {
    const originalFn = descriptor.value!
    descriptor.value = _asyncDebounce<T>(originalFn, wait, opt) as any
    return descriptor
  }
}

/**
 * Like `@_Throttle`, but for async methods.
 *
 * @see {@link _AsyncDebounce}
 *
 * @experimental
 */
export function _AsyncThrottle<T extends AnyAsyncFunction>(
  wait: number,
  opt: AsyncThrottleOptions = {},
): MethodDecorator<T> {
  return (_target, _key, descriptor) => {
    const originalFn = descriptor.value!
    descriptor.value = _asyncThrottle<T>(originalFn, wait, opt) as any
    return descriptor
  }
}
