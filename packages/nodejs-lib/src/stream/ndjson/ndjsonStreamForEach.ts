import { ErrorMode } from '@naturalcycles/js-lib/error/errorMode.js'
import type { AbortableAsyncMapper } from '@naturalcycles/js-lib/types'
import { _pipeline } from '../pipeline/pipeline.js'
import {
  transformLogProgress,
  type TransformLogProgressOptions,
} from '../transform/transformLogProgress.js'
import { transformMap, type TransformMapOptions } from '../transform/transformMap.js'
import { writableVoid } from '../writable/writableVoid.js'
import { createReadStreamAsNDJSON } from './createReadStreamAsNDJSON.js'

export interface NDJSONStreamForEachOptions<IN = any>
  extends TransformMapOptions<IN, void>,
    TransformLogProgressOptions<IN> {
  inputFilePath: string
}

/**
 * Convenience function to `forEach` through an ndjson file.
 */
export async function ndjsonStreamForEach<T>(
  mapper: AbortableAsyncMapper<T, void>,
  opt: NDJSONStreamForEachOptions<T>,
): Promise<void> {
  await _pipeline([
    createReadStreamAsNDJSON(opt.inputFilePath),
    transformMap<T, any>(mapper, {
      errorMode: ErrorMode.THROW_AGGREGATED,
      ...opt,
      predicate: () => true, // to log progress properly
    }),
    transformLogProgress(opt),
    writableVoid(),
  ])
}
