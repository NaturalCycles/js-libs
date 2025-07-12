import { Transform } from 'node:stream'
import type { TransformOptions, TransformTyped } from '../stream.model.js'
import { transformNoOp } from './transformNoOp.js'

export interface TransformOffsetOptions extends TransformOptions {
  /**
   * How many items to skip (offset) in the stream.
   *
   * Nullish value (e.g 0 or undefined) would mean "no offset".
   */
  offset?: number
}

export function transformOffset<IN>(opt: TransformOffsetOptions): TransformTyped<IN, IN> {
  const { offset } = opt

  if (!offset) {
    // No offset - returning pass-through transform
    return transformNoOp()
  }

  let i = 0 // so we start first chunk with 1
  return new Transform({
    objectMode: true,
    ...opt,
    transform(chunk: IN, _, cb) {
      if (++i <= offset) {
        return cb() // skip
      }

      cb(null, chunk)
    },
  })
}
