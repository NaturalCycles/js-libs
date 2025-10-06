/*

This file is "vendored" from Nanoid, all credit is to Nanoid authors:
https://github.com/ai/nanoid/

 */

// oxlint-disable no-bitwise -- NanoID implementation relies on bitwise operations

import { randomFillSync } from 'node:crypto'

type RandomFn = (bytes: number) => Buffer

export const ALPHABET_NONAMBIGUOUS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
export const ALPHABET_NUMBER = '0123456789'
export const ALPHABET_LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
export const ALPHABET_UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const ALPHABET_ALPHANUMERIC_LOWERCASE = [ALPHABET_NUMBER, ALPHABET_LOWERCASE].join('')
export const ALPHABET_ALPHANUMERIC_UPPERCASE = [ALPHABET_NUMBER, ALPHABET_UPPERCASE].join('')
export const ALPHABET_ALPHANUMERIC = [ALPHABET_NUMBER, ALPHABET_LOWERCASE, ALPHABET_UPPERCASE].join(
  '',
)
export const ALPHABET_BASE64 = [ALPHABET_ALPHANUMERIC, '+/'].join('')
export const ALPHABET_BASE64_URL = [ALPHABET_ALPHANUMERIC, '-_'].join('')

// It is best to make fewer, larger requests to the crypto module to
// avoid system call overhead. So, random numbers are generated in a
// pool. The pool is a Buffer that is larger than the initial random
// request size by this multiplier. The pool is enlarged if subsequent
// requests exceed the maximum buffer size.
const POOL_SIZE_MULTIPLIER = 128
let pool: Buffer
let poolOffset: number

function fillPool(bytes: number): void {
  if (!pool || pool.length < bytes) {
    pool = Buffer.allocUnsafe(bytes * POOL_SIZE_MULTIPLIER)
    randomFillSync(pool)
    poolOffset = 0
  } else if (poolOffset + bytes > pool.length) {
    randomFillSync(pool)
    poolOffset = 0
  }
  poolOffset += bytes
}

function random(bytes: number): Buffer {
  // `-=` convert `bytes` to number to prevent `valueOf` abusing
  fillPool((bytes -= 0))
  return pool.subarray(poolOffset - bytes, poolOffset)
}

function customRandom(alphabet: string, defaultSize: number, getRandom: RandomFn) {
  // First, a bitmask is necessary to generate the ID. The bitmask makes bytes
  // values closer to the alphabet size. The bitmask calculates the closest
  // `2^31 - 1` number, which exceeds the alphabet size.
  // For example, the bitmask for the alphabet size 30 is 31 (00011111).
  const mask = (2 << (31 - Math.clz32((alphabet.length - 1) | 1))) - 1
  // Though, the bitmask solution is not perfect since the bytes exceeding
  // the alphabet size are refused. Therefore, to reliably generate the ID,
  // the random bytes redundancy has to be satisfied.

  // Note: every hardware random generator call is performance expensive,
  // because the system call for entropy collection takes a lot of time.
  // So, to avoid additional system calls, extra bytes are requested in advance.

  // Next, a step determines how many random bytes to generate.
  // The number of random bytes gets decided upon the ID size, mask,
  // alphabet size, and magic number 1.6 (using 1.6 peaks at performance
  // according to benchmarks).
  const step = Math.ceil((1.6 * mask * defaultSize) / alphabet.length)

  return (size = defaultSize) => {
    let id = ''
    while (true) {
      const bytes = getRandom(step)
      // A compact alternative for `for (let i = 0; i < step; i++)`.
      let i = step
      while (i--) {
        // Adding `|| ''` refuses a random byte that exceeds the alphabet size.
        id += alphabet[bytes[i]! & mask] || ''
        if (id.length === size) return id
      }
    }
  }
}

export function nanoIdCustomAlphabet(alphabet: string, size = 21): (size?: number) => string {
  return customRandom(alphabet, size, random)
}

export function nanoid(size = 21): string {
  // `-=` convert `size` to number to prevent `valueOf` abusing
  fillPool((size -= 0))
  let id = ''
  // We are reading directly from the random pool to avoid creating new array
  for (let i = poolOffset - size; i < poolOffset; i++) {
    // It is incorrect to use bytes exceeding the alphabet size.
    // The following mask reduces the random byte in the 0-255 value
    // range to the 0-63 value range. Therefore, adding hacks, such
    // as empty string fallback or magic numbers, is unneccessary because
    // the bitmask trims bytes down to the alphabet size.
    id += ALPHABET_BASE64_URL[pool[i]! & 63]
  }
  return id
}
