import type { Reviver } from '../types.js'

/**
 * JSON.stringify that avoids circular references, prints them as [Circular ~]
 *
 * Based on: https://github.com/moll/json-stringify-safe/
 */
export function _safeJsonStringify(
  obj: any,
  replacer?: Reviver,
  spaces?: number,
  cycleReplacer?: Reviver,
): string {
  try {
    // Try native first (as it's ~3 times faster)
    return JSON.stringify(obj, replacer, spaces)
  } catch {
    // Native failed - resort to the "safe" serializer
    return JSON.stringify(obj, serializer(replacer, cycleReplacer), spaces)
  }
}

/* eslint-disable no-bitwise, no-implicit-coercion */
// oxlint-disable no-unused-expressions
function serializer(replacer?: Reviver, cycleReplacer?: Reviver): Reviver {
  const stack: any[] = []
  const keys: string[] = []

  cycleReplacer ??= (_key, value) => {
    if (stack[0] === value) return '[Circular ~]'
    return '[Circular ~.' + keys.slice(0, stack.indexOf(value)).join('.') + ']'
  }

  return function (key, value) {
    if (stack.length > 0) {
      const thisPos = stack.indexOf(this)
      ~thisPos ? stack.splice(thisPos + 1) : stack.push(this)
      ~thisPos ? keys.splice(thisPos, Infinity, key) : keys.push(key)
      if (~stack.indexOf(value)) {
        value = cycleReplacer.call(this, key, value)
      }
    } else {
      stack.push(value)
    }

    return replacer == null ? value : replacer.call(this, key, value)
  }
}
