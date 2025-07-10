import { Transform } from 'node:stream'
import { ErrorMode } from '@naturalcycles/js-lib/error'
import type { CommonLogger } from '@naturalcycles/js-lib/log'
import type { IndexedMapper } from '@naturalcycles/js-lib/types'
import type { TransformTyped } from '../stream.model.js'

export interface TransformMapSimpleOptions {
  /**
   * Only supports THROW_IMMEDIATELY (default) and SUPPRESS.
   *
   * @default ErrorMode.THROW_IMMEDIATELY
   */
  errorMode?: ErrorMode.THROW_IMMEDIATELY | ErrorMode.SUPPRESS

  logger?: CommonLogger
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
  const { errorMode = ErrorMode.THROW_IMMEDIATELY, logger = console } = opt

  return new Transform({
    objectMode: true,
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
