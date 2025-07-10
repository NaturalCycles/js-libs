// Inspired by: https://gist.github.com/Jezternz/c8e9fafc2c114e079829974e3764db75

import { _assert } from '@naturalcycles/js-lib/error'
import type { AnyObject } from '@naturalcycles/js-lib/types'

export interface CSVReaderConfig {
  /**
   * Default: comma
   */
  // delimiter?: string

  /**
   * Default: true
   */
  firstRowIsHeader?: boolean

  /**
   * Array of columns, to be used if there is no header row.
   */
  columns?: string[]
}

// export class CSVReader {
//   constructor (cfg: CSVReaderConfig) {
//     this.cfg = {
//       delimiter: ',',
//       includeHeader: true,
//       ...cfg,
//     }
//   }
//
//   public cfg: Required<CSVReaderConfig>
// }

export function csvStringParse<T extends AnyObject = any>(
  str: string,
  cfg: CSVReaderConfig = {},
): T[] {
  const { firstRowIsHeader = true, columns } = cfg
  const arr = csvStringToArray(str)

  let header = columns
  if (firstRowIsHeader) {
    const firstRow = arr.shift()
    header ||= firstRow
  }

  _assert(header, `firstRowIsHeader or columns is required`)

  return arr.map(row => {
    // eslint-disable-next-line unicorn/no-array-reduce
    return header.reduce((obj, col, i) => {
      ;(obj as any)[col] = row[i]
      return obj
    }, {} as T)
  })
}

export function csvStringToArray(str: string): string[][] {
  const objPattern = /(,|\r?\n|\r|^)(?:"([^"]*(?:""[^"]*)*)"|([^,\r\n]*))/gi
  let matches: RegExpExecArray | null
  const arr: any[][] = [[]]

  while ((matches = objPattern.exec(str))) {
    if (matches[1]!.length && matches[1] !== ',') {
      arr.push([])
    }
    arr[arr.length - 1]!.push(matches[2] ? matches[2].replaceAll('""', '"') : matches[3])
  }
  return arr
}
