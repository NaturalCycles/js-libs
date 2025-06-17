import { _assert } from '../error/assert.js'
import type { PTimeoutOptions } from '../promise/pTimeout.js'
import { pTimeout } from '../promise/pTimeout.js'
import { _getMethodSignature } from './decorator.util.js'

// eslint-disable-next-line @typescript-eslint/naming-convention
export function _Timeout(opt: PTimeoutOptions): MethodDecorator {
  return (_target, key, descriptor) => {
    _assert(typeof descriptor.value === 'function', '@_Timeout can be applied only to methods')

    if (!opt.timeout) return descriptor

    const originalFn = descriptor.value
    const keyStr = String(key)

    descriptor.value = async function (this: typeof _target, ...args: any[]) {
      const ctx = this
      opt.name ||= _getMethodSignature(ctx, keyStr)
      return await pTimeout(() => originalFn.apply(this, args), opt)
    } as any

    return descriptor
  }
}
