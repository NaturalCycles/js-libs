// from: https://github.com/lodash/lodash/blob/master/words.js

import { unicodeWords } from './unicodeWords.js'

// oxlint-disable

const hasUnicodeWord = RegExp.prototype.test.bind(
  /[a-z][A-Z]|[A-Z]{2}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/,
)

/** Used to match words composed of alphanumeric characters. */
const reAsciiWord = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g

function asciiWords(s: string): RegExpMatchArray | null {
  return s.match(reAsciiWord)
}

/**
 * Splits `string` into an array of its words.
 *
 * @param [s=''] The string to inspect.
 * @param [pattern] The pattern to match words.
 * @returns Returns the words of `string`.
 * @example
 *
 * words('fred, barney, & pebbles')
 * // => ['fred', 'barney', 'pebbles']
 *
 * words('fred, barney, & pebbles', /[^, ]+/g)
 * // => ['fred', 'barney', '&', 'pebbles']
 */
export function words(s: string, pattern?: RegExp | string): string[] {
  if (pattern === undefined) {
    const result = hasUnicodeWord(s) ? unicodeWords(s) : asciiWords(s)
    return result || []
  }
  return s.match(pattern) || []
}
