import { Writable } from 'node:stream'
import type { TransformOptions } from '../stream.model.js'

/**
 * Use as a "null-terminator" of stream.pipeline.
 * It consumes the stream as quickly as possible without doing anything.
 * Put it in the end of your pipeline in case it ends with Transform that needs a consumer.
 */
export function writableVoid(opt: TransformOptions = {}): Writable {
  const { objectMode = true, highWaterMark = 1 } = opt
  return new Writable({
    objectMode,
    highWaterMark,
    write(_chunk, _, cb) {
      cb()
    },
    final(cb) {
      cb()
    },
  })
}
