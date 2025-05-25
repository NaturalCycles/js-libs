import { Options } from 'csv-parse'
import * as csvParseLib from 'csv-parse/lib/sync'

/**
 * Convenience function.
 * Implementation based on `csv-stringify` lib.
 *
 * Options: https://csv.js.org/parse/options/
 */
export function csvParse<T = any>(input: string | Buffer, opt: Options = {}): T[] {
  return csvParseLib(input, {
    columns: true,
    // cast: true,
    // header: true,
    ...opt,
  })
}
