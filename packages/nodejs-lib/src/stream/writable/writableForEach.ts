import type { AsyncIndexedMapper, IndexedMapper } from '@naturalcycles/js-lib/types'
import { _passNothingPredicate } from '@naturalcycles/js-lib/types'
import type { WritableTyped } from '../stream.model.js'
import { transformMap, type TransformMapOptions } from '../transform/transformMap.js'
import { transformMapSync, type TransformMapSyncOptions } from '../transform/transformMapSync.js'

/**
 * Just an alias to transformMap that declares OUT as void.
 */
export function writableForEach<IN = any>(
  mapper: AsyncIndexedMapper<IN, void>,
  opt: TransformMapOptions<IN, void> = {},
): WritableTyped<IN> {
  return transformMap<IN, void>(mapper, { ...opt, predicate: _passNothingPredicate })
}

/**
 * Just an alias to transformMap that declares OUT as void.
 */
export function writableForEachSync<IN = any>(
  mapper: IndexedMapper<IN, void>,
  opt: TransformMapSyncOptions<IN, void> = {},
): WritableTyped<IN> {
  return transformMapSync<IN, void>(mapper, { ...opt, predicate: _passNothingPredicate })
}
