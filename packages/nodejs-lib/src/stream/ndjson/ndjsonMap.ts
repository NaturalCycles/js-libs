import { ErrorMode } from '@naturalcycles/js-lib/error/errorMode.js'
import type { AbortableAsyncMapper } from '@naturalcycles/js-lib/types'
import type { TransformLogProgressOptions, TransformMapOptions } from '../index.js'
import { Pipeline } from '../pipeline.js'

export interface NDJSONMapOptions<IN = any, OUT = IN>
  extends TransformMapOptions<IN, OUT>,
    TransformLogProgressOptions<IN> {
  inputFilePath: string
  outputFilePath: string

  limitInput?: number
  limitOutput?: number

  /**
   * @default 100_000
   */
  logEveryOutput?: number
}

/**
 * Unzips input file automatically, if it ends with `.gz`.
 * Zips output file automatically, if it ends with `.gz`.
 */
export async function ndjsonMap<IN = any, OUT = any>(
  mapper: AbortableAsyncMapper<IN, OUT>,
  opt: NDJSONMapOptions<IN, OUT>,
): Promise<void> {
  const { inputFilePath, outputFilePath, logEveryOutput = 100_000, limitInput, limitOutput } = opt

  console.log({
    inputFilePath,
    outputFilePath,
  })

  await Pipeline.fromNDJsonFile<IN>(inputFilePath)
    .limitSource(limitInput)
    .logProgress({ metric: 'read', ...opt })
    .map(mapper, {
      errorMode: ErrorMode.SUPPRESS,
      ...opt,
    })
    .flattenIfNeeded()
    // .typeCastAs<OUT>()
    .limit(limitOutput)
    .logProgress({ metric: 'saved', logEvery: logEveryOutput })
    .toNDJsonFile(outputFilePath)
}
