import { Transform } from 'node:stream'
import { _sortObjectDeep } from '@naturalcycles/js-lib/object'
import type { TransformTyped } from '../stream.model.js'

export interface TransformToNDJsonOptions {
  /**
   * If true - will throw an error on JSON.parse / stringify error
   *
   * @default true
   */
  strict?: boolean

  /**
   * If true - will run `sortObjectDeep()` on each object to achieve deterministic sort
   *
   * @default false
   */
  sortObjects?: boolean

  /**
   * @default `\n`
   */
  separator?: string
}

/**
 * Transforms objects (objectMode=true) into chunks \n-terminated JSON strings (readableObjectMode=false).
 */
export function transformToNDJson<IN = any>(
  opt: TransformToNDJsonOptions = {},
): TransformTyped<IN, string> {
  const { strict = true, separator = '\n', sortObjects = false } = opt

  return new Transform({
    writableObjectMode: true,
    readableObjectMode: false,
    readableHighWaterMark: 64 * 1024,
    transform(chunk: IN, _, cb) {
      try {
        if (sortObjects) {
          chunk = _sortObjectDeep(chunk as any)
        }

        cb(null, JSON.stringify(chunk) + separator)
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
