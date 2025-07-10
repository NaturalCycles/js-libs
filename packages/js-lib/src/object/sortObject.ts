import type { AnyObject } from '../types.js'

/**
 * Returns new object with keys sorder in the given order.
 * All keys that are not listed in `keyOrder` go last.
 * Does not mutate original object.
 */
export function _sortObject<T extends AnyObject>(obj: T, keyOrder: (keyof T)[]): T {
  const r = {} as T

  // First, go over ordered keys
  for (const k of keyOrder) {
    if (k in obj) {
      r[k] = obj[k]
    }
  }

  // Second, go over all other keys
  for (const [k, v] of Object.entries(obj)) {
    if (keyOrder.includes(k)) continue
    r[k as keyof T] = v
  }

  return r
}
