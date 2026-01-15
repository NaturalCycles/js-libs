// oxlint-disable-next-line import/no-cycle -- intentional cycle
import { JsonParseError } from '../error/error.util.js'
import type { Reviver } from '../types.js'

// const possibleJsonStartTokens = ['{', '[', '"']
const DETECT_JSON = /^\s*[{["\-\d]/

/**
 * Attempts to parse object as JSON.
 * Returns original object if JSON parse failed (silently).
 */
export function _jsonParseIfPossible(obj: any, reviver?: Reviver): any {
  // Optimization: only try to parse if it looks like JSON: starts with a json possible character
  if (typeof obj === 'string' && obj && DETECT_JSON.test(obj)) {
    try {
      return JSON.parse(obj, reviver)
    } catch {}
  }

  return obj
}

/**
 * Convenience function that does JSON.parse, but doesn't throw on error,
 * instead - safely returns `undefined`.
 */
export function _jsonParseOrUndefined<T = unknown>(obj: any, reviver?: Reviver): T | undefined {
  // Optimization: only try to parse if it looks like JSON: starts with a json possible character
  if (typeof obj === 'string' && obj && DETECT_JSON.test(obj)) {
    try {
      return JSON.parse(obj, reviver)
    } catch {}
  }
}

/**
 * Same as JSON.parse, but throws JsonParseError:
 *
 * 1. It's message includes a piece of source text (truncated)
 * 2. It's data.text contains full source text
 */
export function _jsonParse<T = unknown>(s: string, reviver?: Reviver): T {
  try {
    return JSON.parse(s, reviver)
  } catch {
    throw new JsonParseError({
      text: s,
    })
  }
}
