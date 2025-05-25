import { Options } from 'csv-stringify'
import * as csvStringifyLib from 'csv-stringify/lib/sync'

/**
 * Convenience function.
 * Implementation based on `csv-stringify` lib.
 */
export function csvStringify(items: any[], opt: Options = {}): string {
  return csvStringifyLib(items, {
    // defaults
    header: true,
    ...opt,
  })
}
