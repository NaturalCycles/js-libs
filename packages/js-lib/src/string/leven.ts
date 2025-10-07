const array: number[] = []
const characterCodeCache: number[] = []

// oxlint-disable no-bitwise, unicorn/prefer-code-point

/**
 * Modified version of: https://github.com/sindresorhus/leven/
 *
 * Returns a Levenshtein distance between first and second word.
 *
 * `limit` optional parameter can be used to limit the distance calculation
 * and skip unnecessary iterations when limit is reached.
 */
export function _leven(first: string, second: string, limit?: number): number {
  if (first === second || limit === 0) {
    return 0
  }

  const swap = first

  // Swapping the strings if `a` is longer than `b` so we know which one is the
  // shortest & which one is the longest
  if (first.length > second.length) {
    first = second
    second = swap
  }

  let firstLength = first.length
  let secondLength = second.length

  // Performing suffix trimming:
  // We can linearly drop suffix common to both strings since they
  // don't increase distance at all
  // Note: `~-` is the bitwise way to perform a `- 1` operation
  while (firstLength > 0 && first.charCodeAt(~-firstLength) === second.charCodeAt(~-secondLength)) {
    firstLength--
    secondLength--
  }

  // Performing prefix trimming
  // We can linearly drop prefix common to both strings since they
  // don't increase distance at all
  let start = 0

  while (start < firstLength && first.charCodeAt(start) === second.charCodeAt(start)) {
    start++
  }

  firstLength -= start
  secondLength -= start

  if (firstLength === 0) {
    if (limit && secondLength >= limit) return limit
    return secondLength
  }

  let bCharacterCode: number
  let result: number
  let temporary: number
  let temporary2: number
  let index = 0
  let index2 = 0

  while (index < firstLength) {
    characterCodeCache[index] = first.charCodeAt(start + index)
    array[index] = ++index
  }

  while (index2 < secondLength) {
    bCharacterCode = second.charCodeAt(start + index2)
    temporary = index2++
    result = index2
    if (limit && result >= limit) return limit // exit early on limit

    for (index = 0; index < firstLength; index++) {
      temporary2 = bCharacterCode === characterCodeCache[index] ? temporary : temporary + 1
      temporary = array[index]!

      result = array[index] =
        temporary > result
          ? temporary2 > result
            ? result + 1
            : temporary2
          : temporary2 > temporary
            ? temporary + 1
            : temporary2
    }
  }

  return result!
}
