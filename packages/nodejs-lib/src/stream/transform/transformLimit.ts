import { Transform } from 'node:stream'
import type { AbortableSignal } from '@naturalcycles/js-lib'
import type { TransformOptions, TransformTyped } from '../stream.model.js'
import { PIPELINE_GRACEFUL_ABORT } from '../stream.util.js'
import { transformNoOp } from './transformNoOp.js'

export interface TransformLimitOptions extends TransformOptions {
  /**
   * Nullish value (e.g 0 or undefined) would mean "no limit"
   */
  limit?: number

  /**
   * Allows to abort (gracefully stop) the stream from inside the Transform.
   */
  signal: AbortableSignal
}

export function transformLimit<IN>(opt: TransformLimitOptions): TransformTyped<IN, IN> {
  const { limit, signal } = opt

  if (!limit) {
    return transformNoOp()
  }

  let i = 0 // so we start first chunk with 1
  let ended = false
  return new Transform({
    objectMode: true,
    ...opt,
    transform(chunk, _, cb) {
      if (ended) {
        return
      }

      i++

      if (i === limit) {
        ended = true
        this.push(chunk)
        this.push(null) // tell downstream that we're done
        cb()
        queueMicrotask(() => {
          signal.abort(new Error(PIPELINE_GRACEFUL_ABORT))
        })
        return
      }

      cb(null, chunk)
    },
  })
}
