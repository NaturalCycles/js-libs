import type { InspectOptions } from 'node:util'
import { inspect } from 'node:util'
import type { JsonStringifyFunction, StringifyOptions } from '@naturalcycles/js-lib/string'
import { _stringify } from '@naturalcycles/js-lib/string'

export interface InspectAnyOptions extends StringifyOptions, InspectOptions {}

const INSPECT_OPT: InspectOptions = {
  breakLength: 80, // default: ??
  depth: 10, // default: 2
}

/**
 * Just a convenience export of a const that fulfills the JsonStringifyFunction interface.
 */
export const inspectStringifyFn: JsonStringifyFunction = obj => inspect(obj, INSPECT_OPT)

/**
 * Transforms ANY to human-readable string (via util.inspect mainly).
 * Safe (no error throwing).
 *
 * Correclty prints Errors, AppErrors, ErrorObjects: error.message + \n + inspect(error.data)
 *
 * Enforces max length (default to 10_000, pass 0 to skip it).
 *
 * Logs numbers as-is, e.g: `6`.
 * Logs strings as-is (without single quotes around, unlike default util.inspect behavior).
 * Otherwise - just uses util.inspect() with reasonable defaults.
 *
 * Returns 'empty_string' if empty string is passed.
 * Returns 'undefined' if undefined is passed (default util.inspect behavior).
 *
 * Based on `_stringify` from `js-lib`, just replaced `JSON.stringify` with `util.inspect`.
 */
export function _inspect(obj: any, opt: InspectAnyOptions = {}): string {
  // Inspect handles functions better
  if (typeof obj === 'function') {
    return inspect(obj, {
      ...INSPECT_OPT,
      ...opt,
    })
  }

  return _stringify(obj, {
    ...opt,
    stringifyFn: obj =>
      inspect(obj, {
        ...INSPECT_OPT,
        ...opt,
      }),
  })
}
