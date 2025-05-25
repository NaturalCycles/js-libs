import { Options } from 'csv-stringify'
import * as csvStringify from 'csv-stringify/lib/sync'
import { Transform } from 'stream'
import { TransformTyped } from '../stream.model'

/**
 * https://csv.js.org/stringify/options/
 */
export interface TransformToCSVOptions extends Options {
  /**
   * @default true
   * If true - will throw an error on JSON.parse / stringify error
   */
  strict?: boolean
}

/**
 * Transforms objects (objectMode=true) into chunks \n-terminated JSON strings (readableObjectMode=false).
 */
export function transformToCSV<IN = any>(
  opt: TransformToCSVOptions = {},
): TransformTyped<IN, string> {
  const { strict = true } = opt
  let { header } = opt

  return new Transform({
    objectMode: true,
    readableObjectMode: false,
    transform(chunk: IN, _encoding, cb) {
      try {
        const str = csvStringify([chunk], {
          ...opt,
          header,
          // columns: ['b', 'a'],
        })

        header = false

        cb(null, str)
      } catch (err) {
        console.error(err)

        if (strict) {
          cb(err) // emit error
        } else {
          cb() // emit no error, but no result neither
        }
      }
    },
  })
}
