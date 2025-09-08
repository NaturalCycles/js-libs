import { ErrorMode } from '@naturalcycles/js-lib/error/errorMode.js'
import type { AbortableAsyncMapper } from '@naturalcycles/js-lib/types'
import { Pipeline } from '../pipeline.js'
import type { TransformLogProgressOptions } from '../transform/transformLogProgress.js'
import type { TransformMapOptions } from '../transform/transformMap.js'

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
  await Pipeline.fromNDJsonFile<T>(opt.inputFilePath)
    .map(mapper, {
      errorMode: ErrorMode.THROW_AGGREGATED,
      ...opt,
      predicate: () => true, // to log progress properly
    })
    .logProgress(opt)
    .run()
}
