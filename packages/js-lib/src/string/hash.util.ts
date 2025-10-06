import type { Integer } from '../types.js'

// oxlint-disable no-bitwise -- hash implementations use bit-level operations for speed

const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
// const BASE64 = BASE62 + '+/'
const BASE64URL = BASE62 + '-_'

/**
 * Returns hashCode as hex (radix 16).
 *
 * All hash functions here are optimized for:
 *
 * 1. Performance
 * 2. For non-cryptographic use (where accidental collision is not the end-of-the-world)
 * 3. Compact size (32 bits max, versus 128 in md5; presented in smaller number of string json-safe characters)
 *
 * Basically, these functions are as simple as they can be, but still "random enough" for
 * normal non-cryptographic use cases.
 *
 * To be run on the ClientSide, as in Node there are plenty of other hash options in `node:crypto`.
 *
 * Perf: it runs ~10 times faster than CryptoJS md5, and ~3 times smaller String hash size (for
 * hashCode64).
 */
export function hashCode16(s: string): string {
  return hashCode(s).toString(16)
}

/**
 * Returns hashCode as "radix 36", using "Base36 alphabet".
 * 36 is used, because it's the maximum "radix" that Number.toString() can take.
 *
 * See the hashCode16 for full description.
 */
export function hashCode36(s: string): string {
  return hashCode(s).toString(36)
}

/**
 * Returns hashCode as "radix 64", using Base64url alphabet.
 * See the hashCode16 for full description.
 */
export function hashCode64(s: string): string {
  return numberToBase(hashCode(s), BASE64URL)
}

/**
 * Generates a stable integer hashCode for a given String.
 * Matches Java implementation (they say), except it ensures a positive Integer
 * by adding 2147483647 + 1 to the end result.
 * Source: https://stackoverflow.com/a/33647870/4919972
 */
export function hashCode(s: string): Integer {
  let hash = 0
  let i = 0
  const len = s.length
  while (i < len) {
    // eslint-disable-next-line unicorn/prefer-math-trunc, unicorn/prefer-code-point
    hash = ((hash << 5) - hash + s.charCodeAt(i++)) << 0
  }
  return hash + 2147483647 + 1
}

/**
 * Source: https://gist.github.com/alkaruno/b84162bae5115f4ca99b
 */
function numberToBase(n: number, alphabet: string): string {
  const alen = alphabet.length
  let result = ''

  do {
    result = alphabet.charAt(n % alen) + result
    n = Math.floor(n / alen) - 1
  } while (n > -1)

  return result
}
