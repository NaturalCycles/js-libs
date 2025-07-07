import { Transform } from 'node:stream'
import type { AsyncIndexedMapper, CommonLogger } from '@naturalcycles/js-lib'
import type { TransformOptions, TransformTyped } from '../stream.model.js'

export interface TransformTapOptions extends TransformOptions {
  logger?: CommonLogger
}

/**
 * Similar to RxJS `tap` - allows to run a function for each stream item, without affecting the result.
 * Item is passed through to the output.
 *
 * Can also act as a counter, since `index` is passed to `fn`
 */
export function transformTap<IN>(
  fn: AsyncIndexedMapper<IN, any>,
  opt: TransformTapOptions = {},
): TransformTyped<IN, IN> {
  const { logger = console } = opt
  let index = -1

  return new Transform({
    objectMode: true,
    ...opt,
    async transform(chunk: IN, _, cb) {
      // console.log('tap', chunk)

      try {
        await fn(chunk, ++index)
      } catch (err) {
        logger.error(err)
        // suppressed error
      }

      cb(null, chunk) // pass through the item
    },
  })
}
