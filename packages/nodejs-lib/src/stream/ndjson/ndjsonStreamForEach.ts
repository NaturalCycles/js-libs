import type { AbortableAsyncMapper } from '@naturalcycles/js-lib'
import { ErrorMode } from '@naturalcycles/js-lib'
import { fs2 } from '../../fs/index.js'
import type { TransformLogProgressOptions, TransformMapOptions } from '../index.js'
import { _pipeline, transformLogProgress, transformMap, writableVoid } from '../index.js'

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
    fs2.createReadStreamAsNDJSON(opt.inputFilePath),
    transformMap<T, any>(mapper, {
      errorMode: ErrorMode.THROW_AGGREGATED,
      ...opt,
      predicate: () => true, // to log progress properly
    }),
    transformLogProgress(opt),
    writableVoid(),
  ])
}
