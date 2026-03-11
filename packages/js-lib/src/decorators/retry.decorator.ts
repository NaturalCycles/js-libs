import type { PRetryOptions } from '../promise/pRetry.js'
import { pRetryFn } from '../promise/pRetry.js'

export function _Retry(opt: PRetryOptions = {}): MethodDecorator {
  return (_target, _key, descriptor) => {
    const originalFn = descriptor.value
    descriptor.value = pRetryFn(originalFn as any, opt)
    return descriptor
  }
}
