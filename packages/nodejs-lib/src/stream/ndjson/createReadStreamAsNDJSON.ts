import { createUnzip } from 'node:zlib'
import { fs2 } from '../../fs/fs2.js'
import type { ReadableTyped } from '../stream.model.js'
import { transformSplitOnNewline } from '../transform/transformSplit.js'

/**
  Returns a Readable of [already parsed] NDJSON objects.
 
  Replaces a list of operations:
  - requireFileToExist(inputPath)
  - fs.createReadStream
  - createUnzip (only if path ends with '.gz')
  - transformSplitOnNewline
  - transformJsonParse
 
  To add a Limit or Offset: just add .take() or .drop(), example:
 
  _pipeline([
    fs2.createReadStreamAsNDJSON().take(100),
    transformX(),
  ])
 */

export function createReadStreamAsNDJSON<ROW = any>(inputPath: string): ReadableTyped<ROW> {
  fs2.requireFileToExist(inputPath)

  let stream: ReadableTyped<ROW> = fs2
    .createReadStream(inputPath, {
      highWaterMark: 64 * 1024, // no observed speedup
    })
    .on('error', err => stream.emit('error', err))

  if (inputPath.endsWith('.gz')) {
    stream = stream.pipe(
      createUnzip({
        chunkSize: 64 * 1024, // speedup from ~3200 to 3800 rps!
      }),
    )
  }

  return stream.pipe(transformSplitOnNewline()).map(line => JSON.parse(line))
  // For some crazy reason .map is much faster than transformJsonParse!
  // ~5000 vs ~4000 rps !!!
  // .on('error', err => stream.emit('error', err))
  // .pipe(transformJsonParse<ROW>())
}
