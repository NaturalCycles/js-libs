import { ErrorMode } from '@naturalcycles/js-lib/error/errorMode.js'
import type { AbortableAsyncMapper } from '@naturalcycles/js-lib/types'
import {
  createReadStreamAsNDJSON,
  createWriteStreamAsNDJSON,
  transformFlatten,
  type TransformLogProgressOptions,
  type TransformMapOptions,
} from '../index.js'
import { _pipeline, transformLimit, transformLogProgress, transformMap } from '../index.js'

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

  const readable = createReadStreamAsNDJSON(inputFilePath).take(
    limitInput || Number.POSITIVE_INFINITY,
  )

  await _pipeline([
    readable,
    transformLogProgress({ metric: 'read', ...opt }),
    transformMap(mapper, {
      errorMode: ErrorMode.SUPPRESS,
      ...opt,
    }),
    transformFlatten(),
    transformLimit({ limit: limitOutput, sourceReadable: readable }),
    transformLogProgress({ metric: 'saved', logEvery: logEveryOutput }),
    ...createWriteStreamAsNDJSON(outputFilePath),
  ])
}
