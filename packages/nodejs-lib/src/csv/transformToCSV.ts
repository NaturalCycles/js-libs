import { Transform } from 'node:stream'
import type { AnyObject } from '@naturalcycles/js-lib/types'
import type { TransformTyped } from '../stream/stream.model.js'
import type { CSVWriterConfig } from './csvWriter.js'
import { CSVWriter } from './csvWriter.js'

export interface TransformToCSVOptions extends CSVWriterConfig {
  /**
   * If true - will throw an error on stringify error
   *
   * @default true
   */
  strict?: boolean
}

/**
 * Transforms objects (objectMode=true) into chunks \n-terminated CSV strings (readableObjectMode=false).
 */
export function transformToCSV<IN extends AnyObject = any>(
  opt: TransformToCSVOptions & {
    /**
     * Columns are required, as they cannot be detected on the fly.
     */
    columns: string[]
  },
): TransformTyped<IN, string> {
  const { strict = true } = opt
  const writer = new CSVWriter(opt)
  let firstRow = true

  return new Transform({
    writableObjectMode: true,
    readableObjectMode: false,
    readableHighWaterMark: 64 * 1024,
    transform(chunk: IN, _, cb) {
      try {
        let s = ''

        if (firstRow) {
          s = writer.writeHeader() + '\n'
          firstRow = false
        }

        cb(null, s + writer.writeRow(chunk) + '\n')
      } catch (err) {
        console.error(err)

        if (strict) {
          cb(err as Error) // emit error
        } else {
          cb() // emit no error, but no result neither
        }
      }
    },
  })
}
