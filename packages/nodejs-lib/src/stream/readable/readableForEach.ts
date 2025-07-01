import type { AbortableAsyncMapper, Mapper } from '@naturalcycles/js-lib'
import { _passNothingPredicate } from '@naturalcycles/js-lib'
import type { ReadableTyped } from '../index.js'
import { _pipeline } from '../index.js'
import type { TransformMapOptions } from '../transform/transformMap.js'
import { transformMap } from '../transform/transformMap.js'

/**
 * Convenience function to do `.forEach` over a Readable.
 * Typed! (unlike default Readable).
 *
 * Try native readable.forEach() instead!
 *
 * @experimental
 */
export async function readableForEach<T>(
  readable: ReadableTyped<T>,
  mapper: AbortableAsyncMapper<T, void>,
  opt: TransformMapOptions<T, void> = {},
): Promise<void> {
  await _pipeline([
    readable,
    transformMap<T, void>(mapper, { ...opt, predicate: _passNothingPredicate }),
  ])
}

/**
 * Convenience function to do `.forEach` over a Readable.
 * Typed! (unlike default Readable).
 *
 * @experimental
 */
export async function readableForEachSync<T>(
  readable: ReadableTyped<T>,
  mapper: Mapper<T, void>,
): Promise<void> {
  // async iteration
  let index = 0
  for await (const item of readable) {
    mapper(item, index++)
  }
}
