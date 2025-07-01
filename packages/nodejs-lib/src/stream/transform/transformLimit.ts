import type { Readable } from 'node:stream'
import type { CommonLogger } from '@naturalcycles/js-lib'
import { AbortableTransform, transformNoOp } from '../index.js'
import type { TransformOptions, TransformTyped } from '../stream.model.js'
import { pipelineClose } from '../stream.util.js'

export interface TransformLimitOptions extends TransformOptions {
  /**
   * Nullish value (e.g 0 or undefined) would mean "no limit"
   */
  limit?: number

  /**
   * If provided (recommended!) - it will call readable.destroy() on limit.
   * Without it - it will only stop the downstream consumers, but won't stop
   * the Readable ("source" of the stream).
   * It is almost always crucial to stop the Source too, so, please provide the Readable here!
   */
  sourceReadable?: Readable

  /**
   * Please provide it (a Promise that resolves when the Stream is done, e.g finished consuming things)
   * to be able to wait for Consumers before calling `readable.destroy`.
   * Has no effect if `readable` is not provided.
   */
  streamDone?: Promise<void>

  logger?: CommonLogger

  /**
   * Set to true to enable additional debug messages, e.g it'll log
   * when readable still emits values after the limit is reached.
   */
  debug?: boolean
}

/**
 * Class only exists to be able to do `instanceof TransformLimit`
 * and to set sourceReadable+streamDone to it in `_pipeline`.
 */
export class TransformLimit extends AbortableTransform {}

export function transformLimit<IN>(opt: TransformLimitOptions): TransformTyped<IN, IN> {
  const { logger = console, limit, debug } = opt

  if (!limit) {
    // No limit - returning pass-through transform
    return transformNoOp()
  }

  let i = 0 // so we start first chunk with 1
  let ended = false
  return new TransformLimit({
    objectMode: true,
    ...opt,
    transform(this: TransformLimit, chunk, _, cb) {
      i++

      if (i === limit) {
        ended = true
        logger.log(`transformLimit of ${limit} reached`)
        this.push(chunk)

        pipelineClose(
          'transformLimit',
          this,
          opt.sourceReadable || this.sourceReadable,
          opt.streamDone || this.streamDone,
          logger,
        )

        cb() // after pause
      } else if (!ended) {
        cb(null, chunk)
      } else {
        if (debug) logger.log(`transformLimit.transform after limit`, i)
        // If we ever HANG (don't call cb) - Node will do process.exit(0) to us
        cb() // ended, don't emit anything
      }
    },
  })
}
