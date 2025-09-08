import { Transform } from 'node:stream'
import type { PositiveInteger } from '@naturalcycles/js-lib/types'
import type { TransformOptions, TransformTyped } from '../stream.model.js'

/**
 * Similar to RxJS bufferCount(),
 * allows to "chunk" the input stream into chunks of `opt.chunkSize` size.
 * Last chunk will contain the remaining items, possibly less than chunkSize.
 *
 * `chunkSize` indicates how many items to include in each chunk.
 * Last chunk will contain the remaining items, possibly less than chunkSize.
 */
export function transformChunk<IN = any>(
  chunkSize: PositiveInteger,
  opt?: TransformOptions,
): TransformTyped<IN, IN[]> {
  let buf: IN[] = []

  return new Transform({
    objectMode: true,
    ...opt,
    transform(chunk, _, cb) {
      buf.push(chunk)

      if (buf.length >= chunkSize) {
        cb(null, buf)
        buf = []
      } else {
        cb()
      }
    },
    final(this: Transform, cb) {
      if (buf.length) {
        this.push(buf)
        buf = []
      }

      cb()
    },
  })
}
