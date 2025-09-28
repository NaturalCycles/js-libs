/**
 * Converts the first character of string to upper case and the remaining to lower case.
 * Returns a type-safe capitalized string.
 */
export function _capitalize(s = ''): Capitalize<string> {
  return (s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()) as Capitalize<string>
}

/**
 * Convert a string to a type-safe uppercase string.
 */
export function _toUpperCase(s: string): Uppercase<string> {
  return s.toUpperCase() as Uppercase<string>
}

/**
 * Convert a string to a type-safe lowercase string.
 */
export function _toLowercase(s: string): Lowercase<string> {
  return s.toLowerCase() as Lowercase<string>
}

export function _upperFirst(s = ''): Capitalize<string> {
  return (s.charAt(0).toUpperCase() + s.slice(1)) as Capitalize<string>
}

export function _lowerFirst(s: string): Uncapitalize<string> {
  return (s.charAt(0).toLowerCase() + s.slice(1)) as Uncapitalize<string>
}

/**
 * Like String.split(), but with limit, returning the tail together with last element.
 *
 * @returns Returns the new array of string segments.
 */
export function _split(str: string, separator: string, limit: number): string[] {
  const parts = str.split(separator)
  if (parts.length <= limit) return parts
  return [...parts.slice(0, limit - 1), parts.slice(limit - 1).join(separator)]
}

export function _removeWhitespace(s: string): string {
  return s.replaceAll(/\s/g, '')
}

/**
 * _.truncate('hi-diddly-ho there, neighborino')
 * // => 'hi-diddly-ho there, neighbo...'
 */
export function _truncate(s: string, maxLen: number, omission = '...'): string {
  if (!s || s.length <= maxLen) return s
  if (maxLen <= omission.length) return omission
  return s.slice(0, maxLen - omission.length) + omission
}

/**
 * _.truncateMiddle('abcdefghijklmnopqrstuvwxyz', 10)
 * // => 'abcd...xyz'
 */
export function _truncateMiddle(s: string, maxLen: number, omission = '...'): string {
  if (!s || s.length <= maxLen) return s
  if (maxLen <= omission.length) return omission

  const mark1 = Math.round((maxLen - omission.length) / 2)
  const mark2 = s.length - Math.floor((maxLen - omission.length) / 2)
  return s.slice(0, mark1) + omission + s.slice(mark2)
}

// These functions are modeled after Kotlin's String API

export function _substringBefore(s: string, delimiter: string): string {
  const pos = s.indexOf(delimiter)
  return s.slice(0, pos !== -1 ? pos : undefined)
}

export function _substringBeforeLast(s: string, delimiter: string): string {
  const pos = s.lastIndexOf(delimiter)
  return s.slice(0, pos !== -1 ? pos : undefined)
}

export function _substringAfter(s: string, delimiter: string): string {
  const pos = s.indexOf(delimiter)
  return pos !== -1 ? s.slice(pos + delimiter.length) : s
}

export function _substringAfterLast(s: string, delimiter: string): string {
  const pos = s.lastIndexOf(delimiter)
  return pos !== -1 ? s.slice(pos + delimiter.length) : s
}

/**
 * Returns the substring between LAST `leftDelimiter` and then FIRST `rightDelimiter`.
 *
 * @example
 *
 * const s = '/Users/lalala/someFile.test.ts'
 * _substringBetweenLast(s, '/', '.')
 * // `someFile`
 */
export function _substringBetweenLast(
  s: string,
  leftDelimiter: string,
  rightDelimiter: string,
): string {
  return _substringBefore(_substringAfterLast(s, leftDelimiter), rightDelimiter)
}

/**
 * Converts `\n` (aka new-line) to `<br>`, to be presented in HTML.
 * Keeps `\n`, so if it's printed in non-HTML environment it still looks ok-ish.
 */
export function _nl2br(s: string): string {
  return s.replaceAll('\n', '<br>\n')
}
