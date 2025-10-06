// Vendored from https://github.com/ai/nanoid/blob/main/index.browser.js
// All credit to nanoid authors: https://github.com/ai/nanoid
// Reason for vendoring: (still) cannot import esm, and Nanoid went ESM-only since 4.0

/// <reference lib="dom" preserve="true" />

// "0-9a-zA-Z-_", same as base64url alphabet
const urlAlphabet = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict'

/**
 * Function that takes a length (defaults to 21) and generates a random string id of that length.
 */
export type NanoidFunction = (length?: number) => string

type NanoidRandomFunction = (bytes: number) => Uint8Array

// oxlint-disable no-bitwise -- NanoID uses bit operations to build compact IDs
export function nanoidBrowser(length = 21): string {
  let id = ''
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(length))
  while (length--) {
    // Using the bitwise AND operator to "cap" the value of
    // the random byte from 255 to 63, in that way we can make sure
    // that the value will be a valid index for the "chars" string.
    id += urlAlphabet[bytes[length]! & 63]
  }
  return id
}

const defaultRandomFunction: NanoidRandomFunction = (bytes: number) =>
  globalThis.crypto.getRandomValues(new Uint8Array(bytes))

export function nanoidBrowserCustomAlphabet(alphabet: string, length = 21): NanoidFunction {
  return customRandom(alphabet, length, defaultRandomFunction)
}

function customRandom(
  alphabet: string,
  defaultSize: number,
  getRandom: NanoidRandomFunction,
): NanoidFunction {
  // First, a bitmask is necessary to generate the ID. The bitmask makes bytes
  // values closer to the alphabet size. The bitmask calculates the closest
  // `2^31 - 1` number, which exceeds the alphabet size.
  // For example, the bitmask for the alphabet size 30 is 31 (00011111).
  // `Math.clz32` is not used, because it is not available in browsers.
  const mask = (2 << Math.log2(alphabet.length - 1)) - 1
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

  // `-~f => Math.ceil(f)` if f is a float
  // `-~i => i + 1` if i is an integer
  const step = -~((1.6 * mask * defaultSize) / alphabet.length)

  return (size = defaultSize) => {
    let id = ''
    while (true) {
      const bytes = getRandom(step)
      // A compact alternative for `for (var i = 0; i < step; i++)`.
      let j = step
      while (j--) {
        // Adding `|| ''` refuses a random byte that exceeds the alphabet size.
        id += alphabet[bytes[j]! & mask] || ''
        if (id.length === size) return id
      }
    }
  }
}
