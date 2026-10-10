import type { Readable } from 'node:stream'
import { pipeline } from 'node:stream'
import { createUnzip, createZstdDecompress } from 'node:zlib'
import { _noop } from '@naturalcycles/js-lib/types'
import { fs2 } from '../../fs/fs2.js'
import type { ReadableTyped } from '../stream.model.js'
import { transformSplitOnNewline } from '../transform/transformSplit.js'
import { transformJsonParse } from './transformJsonParse.js'

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

  const streams: Readable[] = [
    fs2.createReadStream(inputPath, {
      highWaterMark: 256 * 1024, // 64KB had no observed speedup over the default; 256KB is +6-12% end-to-end on ~9KB rows, neutral on ~180B rows, 1MB brings nothing more
    }),
  ]

  if (inputPath.endsWith('.gz')) {
    streams.push(
      createUnzip({
        chunkSize: 256 * 1024, // 64KB: speedup from ~3200 to 3800 rps! 256KB: +6-8% more on ~9KB rows, neutral on ~180B rows
      }),
    )
  } else if (inputPath.endsWith('.zst')) {
    streams.push(
      createZstdDecompress({
        chunkSize: 256 * 1024, // tested: 256KB is +10-12% over 64KB on ~9KB rows, neutral on ~180B rows
      }),
    )
  }

  const output = transformJsonParse<ROW>()
  streams.push(transformSplitOnNewline(), output)

  // `pipeline` (unlike `.pipe`) forwards errors: when any stream fails (e.g. a corrupt .gz file),
  // all of them are destroyed with that error, so the consumer of `output` gets a rejection,
  // instead of the process crashing with an unhandled 'error' event.
  // The error is also passed to the callback, where there's nothing more to do with it.
  pipeline(streams, _noop)

  return output
  // It used to be `.map(line => JSON.parse(line))`, because "for some crazy reason .map is much faster than transformJsonParse!
  // ~5000 vs ~4000 rps !!!". Measured again on Node 24, it's the opposite: Readable.map costs ~1µs per row in promise machinery,
  // transformJsonParse() is 1.5x (consumed via pipeline) to 1.75x (consumed via for-await) faster on ~180B rows.
}
