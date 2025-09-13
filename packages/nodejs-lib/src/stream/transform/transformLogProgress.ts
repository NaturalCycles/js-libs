import { Transform } from 'node:stream'
import type { ProgressLoggerCfg } from '../progressLogger.js'
import { progressLogger } from '../progressLogger.js'
import type { TransformOptions, TransformTyped } from '../stream.model.js'

export interface TransformLogProgressOptions<IN = any>
  extends ProgressLoggerCfg<IN>,
    TransformOptions {}

/**
 * Pass-through transform that optionally logs progress.
 */
export function transformLogProgress<IN = any>(
  opt: TransformLogProgressOptions = {},
): TransformTyped<IN, IN> {
  const { objectMode = true, highWaterMark = 1 } = opt
  const progress = progressLogger(opt)

  return new Transform({
    objectMode,
    highWaterMark,
    transform(chunk: IN, _, cb) {
      progress.log(chunk)
      cb(null, chunk) // pass-through
    },
    final(cb) {
      progress.done()
      cb()
    },
  })
}
