import { _isBackendErrorResponseObject, _isErrorLike, _isErrorObject } from '../error/error.util.js'
import type { ErrorLike } from '../error/index.js'
import type { Reviver } from '../types.js'
import { _jsonParseIfPossible } from './json.util.js'
import { _safeJsonStringify } from './safeJsonStringify.js'
import { _truncateMiddle } from './string.util.js'

const supportsAggregateError = typeof globalThis.AggregateError === 'function'

let globalStringifyFunction: JsonStringifyFunction = _safeJsonStringify

/**
 * Allows to set Global "stringifyFunction" that will be used to "pretty-print" objects
 * in various cases.
 *
 * Used, for example, by _stringify() to pretty-print objects/arrays.
 *
 * Defaults to _safeJsonStringify.
 *
 * Node.js project can set it to _inspect, which allows to use `util.inspect`
 * as pretty-printing function.
 *
 * It's recommended that this function is circular-reference-safe.
 */
export function setGlobalStringifyFunction(fn: JsonStringifyFunction): void {
  globalStringifyFunction = fn
}

export type JsonStringifyFunction = (obj: any, reviver?: Reviver, space?: number) => string

export interface StringifyOptions {
  /**
   * @default 10_000
   * Default limit is less than in Node, cause it's likely to be used e.g in Browser alert()
   */
  maxLen?: number

  /**
   * Set to true to print Error.stack instead of just Error.message.
   *
   * @default false
   */
  includeErrorStack?: boolean

  /**
   * Set to false to skip including Error.cause.
   *
   * @default true
   */
  includeErrorCause?: boolean

  /**
   * Set to true to include Error.data.
   *
   * @default false
   */
  includeErrorData?: boolean

  /**
   * Allows to pass custom "stringify function".
   * E.g in Node.js you can pass `util.inspect` instead.
   *
   * Defaults to `globalStringifyFunction`, which defaults to `_safeJsonStringify`
   */
  stringifyFn?: JsonStringifyFunction
}

/**
 * Inspired by `_inspect` from nodejs-lib, which is based on util.inpect that is not available in the Browser.
 * Potentially can do this (with extra 2Kb gz size): https://github.com/deecewan/browser-util-inspect
 *
 * Transforms ANY to human-readable string (via JSON.stringify pretty).
 * Safe (no error throwing).
 *
 * Correctly prints Errors, AppErrors, ErrorObjects: error.message + \n + _stringify(error.data)
 *
 * Enforces max length (default to 1000, pass 0 to skip it).
 *
 * Logs numbers as-is, e.g: `6`.
 * Logs strings as-is (without single quotes around, unlike default util.inspect behavior).
 * Otherwise - just uses JSON.stringify().
 *
 * Returns 'empty_string' if empty string is passed.
 * Returns 'undefined' if undefined is passed (default util.inspect behavior).
 */
export function _stringify(obj: any, opt: StringifyOptions = {}): string {
  if (obj === undefined) return 'undefined'
  if (obj === null) return 'null'
  if (typeof obj === 'function') return 'function'
  if (typeof obj === 'symbol') return obj.toString()

  let s: string

  // Parse JSON string, if possible
  obj = _jsonParseIfPossible(obj) // in case it's e.g non-pretty JSON, or even a stringified ErrorObject

  //
  // HttpErrorResponse
  //
  if (_isBackendErrorResponseObject(obj)) {
    return _stringify(obj.error, opt)
  }

  if (obj instanceof Error || _isErrorLike(obj)) {
    s = stringifyErrorLike(obj, opt)
  } else if (typeof obj === 'string') {
    s = obj.trim() || 'empty_string'
    // todo: think about it more
    // Stringifying it like a JSON would.
    // To highlight that it's a String (and not a Number) - using double-quotes, JSON-like.
    // s = `"${obj}"`
  } else if (typeof obj === 'number') {
    s = String(obj)
    // todo: support RegExp and Date, when split between Browser and Node stringification is implemented
    // } else if (obj instanceof RegExp) {
    //   s = String(obj)
    // } else if (obj instanceof Date) {
    //   s = `Date (${obj.toISOString()})`
  } else {
    //
    // Other
    //
    if (obj instanceof Map) {
      // todo: double-check it, maybe Node's inspect has good built-in stringification

      obj = Object.fromEntries(obj)
    } else if (obj instanceof Set) {
      obj = [...obj]
    }

    try {
      const { stringifyFn = globalStringifyFunction } = opt

      s = stringifyFn(obj, undefined, 2)
    } catch {
      s = String(obj) // fallback
    }
  }

  // Shouldn't happen, but some weird input parameters may return this
  if (s === undefined) return 'undefined'

  // Handle maxLen
  const { maxLen = 10_000 } = opt
  if (maxLen && s.length > maxLen) {
    return _truncateMiddle(
      s,
      maxLen,
      `\n... ${Math.ceil(s.length / 1024)} Kb message truncated ...\n`,
    )
  }

  return s
}

function stringifyErrorLike(obj: Error | ErrorLike, opt: StringifyOptions): string {
  const { includeErrorCause = true } = opt

  let s = [obj.name, obj.message].filter(Boolean).join(': ')

  if (typeof (obj as any).code === 'string') {
    // Error that has no `data`, but has `code` property
    s += `\ncode: ${(obj as any).code}`
  }

  if (opt.includeErrorData && _isErrorObject(obj) && Object.keys(obj.data).length) {
    s += '\n' + _stringify(obj.data, opt)
  }

  if (opt.includeErrorStack && obj.stack) {
    // Here we're using the previously-generated "title line" (e.g "Error: some_message"),
    // concatenating it with the Stack (but without the title line of the Stack)
    // This is to fix the rare error (happened with Got) where `err.message` was changed,
    // but err.stack had "old" err.message
    // This should "fix" that
    const sLines = s.split('\n').length

    s = [s, ...obj.stack.split('\n').slice(sLines)].join('\n')
  }

  if (supportsAggregateError && obj instanceof AggregateError && obj.errors.length) {
    s = [
      s,
      `${obj.errors.length} error(s):`,
      ...obj.errors.map((err, i) => `${i + 1}. ${_stringify(err, opt)}`),
    ].join('\n')
  }

  if (obj.cause && includeErrorCause) {
    s = s + '\nCaused by: ' + _stringify(obj.cause, opt)
  }
  return s
}
