/*

Vendored:
https://github.com/sindresorhus/escape-goat

(c) Sindre Sorhus

Reasons:
1. Stable enough to be included in "core" js-lib
2. ESM-only

 */

// Multiple `.replace()` calls are actually faster than using replacer functions
import type { SafeHtml } from '../types.js'

function _htmlEscape(s: string): SafeHtml {
  return s
    .replaceAll('&', '&amp;') // Must happen first or else it will escape other just-escaped characters.
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;') as SafeHtml
}

function _htmlUnescape(html: string): string {
  return html
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll(/&#0?39;/g, "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&') // Must happen last or else it will unescape other characters in the wrong order.
}

export function htmlEscape(strings: string | TemplateStringsArray, ...values: any[]): SafeHtml {
  if (typeof strings === 'string') {
    return _htmlEscape(strings)
  }

  let output = strings[0]!
  for (const [index, value] of values.entries()) {
    output = output + _htmlEscape(String(value)) + strings[index + 1]
  }

  return output as SafeHtml
}

export function htmlUnescape(strings: string | TemplateStringsArray, ...values: any[]): string {
  if (typeof strings === 'string') {
    return _htmlUnescape(strings)
  }

  let output = strings[0]!
  for (const [index, value] of values.entries()) {
    output = output + _htmlUnescape(String(value)) + strings[index + 1]
  }

  return output
}
