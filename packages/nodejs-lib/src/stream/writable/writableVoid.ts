import { Writable } from 'node:stream'
import type { TransformOptions } from '../stream.model.js'

/**
 * Use as a "null-terminator" of stream.pipeline.
 * It consumes the stream as quickly as possible without doing anything.
 * Put it in the end of your pipeline in case it ends with Transform that needs a consumer.
 */
export function writableVoid(opt: TransformOptions = {}): Writable {
  return new Writable({
    objectMode: true,
    ...opt,
    write(_chunk, _, cb) {
      cb()
    },
    final(cb) {
      cb()
    },
  })
}
