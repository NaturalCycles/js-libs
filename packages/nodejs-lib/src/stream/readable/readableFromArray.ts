import type { ReadableOptions } from 'node:stream'
import { Readable } from 'node:stream'
import type { AbortableAsyncMapper } from '@naturalcycles/js-lib/types'
import { _passthroughMapper } from '@naturalcycles/js-lib/types'
import type { ReadableTyped } from '../stream.model.js'

/**
 * Create Readable from Array.
 * Supports a `mapper` function (async) that you can use to e.g create a timer-emitting-readable.
 *
 * For simple cases use Readable.from(...) (Node.js 12+)
 */
export function readableFromArray<IN, OUT>(
  items: IN[],
  mapper: AbortableAsyncMapper<IN, OUT> = _passthroughMapper,
  opt?: ReadableOptions,
): ReadableTyped<OUT> {
  let i = -1

  return new Readable({
    objectMode: true,
    ...opt,
    async read() {
      i++
      if (i < items.length) {
        try {
          this.push(await mapper(items[i]!, i))
        } catch (err) {
          console.error(err)
          this.destroy(err as Error)
        }
      } else {
        this.push(null) // end
      }
    },
  })
}
