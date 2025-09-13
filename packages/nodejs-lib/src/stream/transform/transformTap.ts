import { Transform } from 'node:stream'
import type { AsyncIndexedMapper, IndexedMapper } from '@naturalcycles/js-lib/types'
import type { TransformOptions, TransformTyped } from '../stream.model.js'

/**
 * Similar to RxJS `tap` - allows to run a function for each stream item, without affecting the result.
 * Item is passed through to the output.
 *
 * Can also act as a counter, since `index` is passed to `fn`
 */
export function transformTap<IN>(
  fn: AsyncIndexedMapper<IN, any>,
  opt: TransformOptions = {},
): TransformTyped<IN, IN> {
  const { logger = console, highWaterMark = 1 } = opt
  let index = -1

  return new Transform({
    objectMode: true,
    highWaterMark,
    async transform(chunk: IN, _, cb) {
      try {
        await fn(chunk, ++index)
      } catch (err) {
        logger.error(err)
        // suppressed error
      }

      cb(null, chunk)
    },
  })
}

/**
 * Sync version of transformTap
 */
export function transformTapSync<IN>(
  fn: IndexedMapper<IN, any>,
  opt: TransformOptions = {},
): TransformTyped<IN, IN> {
  const { logger = console, highWaterMark = 1 } = opt
  let index = -1

  return new Transform({
    objectMode: true,
    highWaterMark,
    transform(chunk: IN, _, cb) {
      try {
        fn(chunk, ++index)
      } catch (err) {
        logger.error(err)
        // suppressed error
      }

      cb(null, chunk)
    },
  })
}
