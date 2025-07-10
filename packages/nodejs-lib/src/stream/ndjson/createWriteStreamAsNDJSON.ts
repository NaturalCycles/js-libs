import { createGzip } from 'node:zlib'
import { _isTruthy } from '@naturalcycles/js-lib'
import { fs2 } from '../../fs/fs2.js'
import type { TransformTyped } from '../stream.model.js'
import { transformToNDJson } from './transformToNDJson.js'

/**
  Returns an array of Transforms, so that you can ...destructure them at
  the end of the _pipeline.
 
  Replaces a list of operations:
  - transformToNDJson
  - createGzip (only if path ends with '.gz')
  - fs.createWriteStream
 */
export function createWriteStreamAsNDJSON(outputPath: string): TransformTyped<any, any>[] {
  fs2.ensureFile(outputPath)

  return [
    transformToNDJson(),
    outputPath.endsWith('.gz')
      ? createGzip({
          // chunkSize: 64 * 1024, // no observed speedup
        })
      : undefined,
    fs2.createWriteStream(outputPath, {
      // highWaterMark: 64 * 1024, // no observed speedup
    }),
  ].filter(_isTruthy) as TransformTyped<any, any>[]
}
