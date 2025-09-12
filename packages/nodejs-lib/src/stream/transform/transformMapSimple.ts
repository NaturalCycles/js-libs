import { Transform } from 'node:stream'
import { ErrorMode } from '@naturalcycles/js-lib/error/errorMode.js'
import type { IndexedMapper } from '@naturalcycles/js-lib/types'
import type { TransformOptions, TransformTyped } from '../stream.model.js'

export interface TransformMapSimpleOptions extends TransformOptions {
  /**
   * Only supports THROW_IMMEDIATELY (default) and SUPPRESS.
   *
   * @default ErrorMode.THROW_IMMEDIATELY
   */
  errorMode?: ErrorMode.THROW_IMMEDIATELY | ErrorMode.SUPPRESS
}

/**
 * Simplest version of `transformMap`.
 * errorMode: IMMEDIATE
 * Sync mode.
 * Has 0 options to configure.
 * If you need any configuration - use transformMap or transformMapSync.
 * Sync (not async) version of transformMap.
 * Supposedly faster, for cases when async is not needed.
 */
export function transformMapSimple<IN = any, OUT = IN>(
  mapper: IndexedMapper<IN, OUT>,
  opt: TransformMapSimpleOptions = {},
): TransformTyped<IN, OUT> {
  let index = -1
  const {
    errorMode = ErrorMode.THROW_IMMEDIATELY,
    logger = console,
    objectMode = true,
    highWaterMark,
  } = opt

  return new Transform({
    objectMode,
    highWaterMark,
    transform(chunk: IN, _, cb) {
      try {
        cb(null, mapper(chunk, ++index))
      } catch (err) {
        logger.error(err)

        if (errorMode === ErrorMode.SUPPRESS) {
          cb() // suppress the error
        } else {
          // Emit the error
          cb(err as Error)
        }
      }
    },
  })
}
