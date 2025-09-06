import { Transform } from 'node:stream'
import type { Reviver } from '@naturalcycles/js-lib/types'
import type { TransformTyped } from '../stream.model.js'

export interface TransformJsonParseOptions {
  /**
   * If true - will throw an error on JSON.parse / stringify error
   *
   * @default true
   */
  strict?: boolean

  reviver?: Reviver
}

/**
 * Transforms chunks of JSON strings/Buffers (objectMode=false) into parsed objects (readableObjectMode=true).
 *
 * if strict - will throw an error on JSON.parse / stringify error
 *
 * Usage:
 *
 * await _pipeline([
 *   readable,
 *   binarySplit(),
 *   transformJsonParse(),
 *   consumeYourStream...
 * [)
 */
export function transformJsonParse<ROW = any>(
  opt: TransformJsonParseOptions = {},
): TransformTyped<string | Buffer, ROW> {
  const { strict = true, reviver } = opt

  return new Transform({
    writableObjectMode: false,
    readableObjectMode: true,
    // highWatermark increased, because it's proven to be faster: https://github.com/nodejs/node/pull/52037
    writableHighWaterMark: 64 * 1024,
    transform(chunk: string, _, cb) {
      try {
        const data = JSON.parse(chunk, reviver)
        cb(null, data)
      } catch (err) {
        if (strict) {
          cb(err as Error) // emit error
        } else {
          console.error(err)
          cb() // emit no error, but no result neither
        }
      }
    },
  })
}

// Based on: https://stackoverflow.com/a/34557997/4919972
export const bufferReviver: Reviver = (_k, v) => {
  if (v !== null && typeof v === 'object' && v.type === 'Buffer' && Array.isArray(v.data)) {
    return Buffer.from(v.data)
  }

  return v
}
