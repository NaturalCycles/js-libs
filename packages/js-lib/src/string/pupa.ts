/*

Vendored:
https://github.com/sindresorhus/pupa

(c) Sindre Sorhus

Reasons:
1. Stable enough to be included in "core" js-lib
2. ESM-only

 */

import type { AnyObject } from '../types.js'
import { htmlEscape } from './escape.js'

export class MissingValueError extends Error {
  constructor(public key: any) {
    super(`Missing a value for ${key ? `the placeholder: ${key}` : 'a placeholder'}`)
    this.name = 'MissingValueError'
  }
}

export interface PupaOptions {
  /**
   * By default, Pupa throws a `MissingValueError` when a placeholder resolves to `undefined`. With this option set to `true`, it simply ignores it and leaves the placeholder as is.
   */
  ignoreMissing?: boolean

  /**
   * Performs arbitrary operation for each interpolation. If the returned value was `undefined`, it behaves differently depending on the `ignoreMissing` option. Otherwise, the returned value will be interpolated into a string (and escaped when double-braced) and embedded into the template.
   */
  transform?: (data: { value: any; key: string }) => unknown
}

// The regex tries to match either a number inside `{{ }}` or a valid JS identifier or key path.
// Group 1 is the key of `{{key}}`, group 2 is the key of `{key}`.
const PLACEHOLDER_REGEX =
  /{{(\d+|[a-z$_][\w\-$]*?(?:\.[\w\-$]*?)*?)}}|{(\d+|[a-z$_][\w\-$]*?(?:\.[\w\-$]*?)*?)}/gi

/**
 * API: https://github.com/sindresorhus/pupa
 *
 * Differs from upstream: both brace styles are substituted in a single pass, so a substituted value
 * is never scanned for placeholders. Upstream runs the `{key}` pass over the output of the
 * `{{key}}` pass, which inserts a value unescaped when a double-braced value contains `{key}`.
 */
export function pupa(
  template: string,
  data: readonly any[] | AnyObject,
  opt: PupaOptions = {},
): string {
  if (typeof template !== 'string') {
    throw new TypeError(`Expected a \`string\` in the first argument, got \`${typeof template}\``)
  }

  if (typeof data !== 'object') {
    throw new TypeError(
      `Expected an \`object\` or \`Array\` in the second argument, got \`${typeof data}\``,
    )
  }

  const { ignoreMissing = false, transform = ({ value }) => value } = opt

  return template.replaceAll(
    PLACEHOLDER_REGEX,
    (placeholder: string, escapedKey: string | undefined, rawKey: string | undefined) => {
      const key = escapedKey ?? rawKey!
      let value = data
      for (const property of key.split('.')) {
        value = value ? (value as AnyObject)[property] : undefined
      }

      const transformedValue = transform({ value, key })
      if (transformedValue === undefined) {
        if (ignoreMissing) {
          return placeholder
        }

        throw new MissingValueError(key)
      }

      const stringValue = String(transformedValue)
      return escapedKey === undefined ? stringValue : htmlEscape(stringValue)
    },
  )
}
