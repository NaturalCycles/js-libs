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

/**
 * API: https://github.com/sindresorhus/pupa
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

  const replace = (placeholder: string, key: string): string => {
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

    return String(transformedValue)
  }

  const composeHtmlEscape =
    (replacer: any) =>
    (...args: any[]) =>
      htmlEscape(replacer(...args))

  // The regex tries to match either a number inside `{{ }}` or a valid JS identifier or key path.
  const doubleBraceRegex = /{{(\d+|[a-z$_][\w\-$]*?(?:\.[\w\-$]*?)*?)}}/gi

  if (doubleBraceRegex.test(template)) {
    template = template.replaceAll(doubleBraceRegex, composeHtmlEscape(replace))
  }

  const braceRegex = /{(\d+|[a-z$_][\w\-$]*?(?:\.[\w\-$]*?)*?)}/gi

  return template.replaceAll(braceRegex, replace)
}
