import { createUnzip, createZstdDecompress } from 'node:zlib'
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

 createReadStreamAsNDJson().take(100)
 */

export function createReadStreamAsNDJson<ROW = any>(inputPath: string): ReadableTyped<ROW> {
  fs2.requireFileToExist(inputPath)

  let stream: ReadableTyped<ROW> = fs2
    .createReadStream(inputPath, {
      highWaterMark: 256 * 1024, // 64KB had no observed speedup over the default; 256KB is +6-12% end-to-end on ~9KB rows, neutral on ~180B rows, 1MB brings nothing more
    })
    .on('error', err => stream.destroy(err))

  if (inputPath.endsWith('.gz')) {
    stream = stream.pipe(
      createUnzip({
        chunkSize: 256 * 1024, // 64KB: speedup from ~3200 to 3800 rps! 256KB: +6-8% more on ~9KB rows, neutral on ~180B rows
      }),
    )
  } else if (inputPath.endsWith('.zst')) {
    stream = stream.pipe(
      createZstdDecompress({
        chunkSize: 256 * 1024, // tested: 256KB is +10-12% over 64KB on ~9KB rows, neutral on ~180B rows
      }),
    )
  }

  return stream.pipe(transformSplitOnNewline()).map(line => JSON.parse(line))
  // For some crazy reason .map is much faster than transformJsonParse!
  // ~5000 vs ~4000 rps !!!
  // .on('error', err => stream.emit('error', err))
  // .pipe(transformJsonParse<ROW>())
}
