import { Transform } from 'node:stream'
import type { TransformTyped } from '../stream.model.js'

// The code below is carefully adopted from: https://github.com/max-mapper/binary-split
// (including the v2.0.0 performance improvements: native Buffer#indexOf and linear-time long lines)

/**
 * Transforms input Buffer/string stream into Buffer chunks (objectMode: true) split by newLine.
 *
 * Useful for reading NDJSON files from fs.
 *
 * Same as `transformSplit('\n')`.
 * (It used to be a separate hard-coded implementation, +5-10% faster than the generic one,
 * but since the generic one searches 1-byte separators by byte value there's no difference anymore)
 */
export function transformSplitOnNewline(): TransformTyped<Buffer, Buffer> {
  return transformSplit('\n')
}

/**
 * Input: stream (objectMode=false) of arbitrary string|Buffer chunks, like when read from fs
 * Output: stream (objectMode=true) or string|Buffer chunks split by `separator` (@default to `\n`)
 *
 * Empty lines (consecutive separators) are skipped.
 * Trailing data without a separator is emitted on flush.
 */
export function transformSplit(separator = '\n'): TransformTyped<Buffer, Buffer> {
  const matcher = Buffer.from(separator)
  if (matcher.length === 0) {
    throw new Error('transformSplit: separator must not be empty')
  }
  const matcherLength = matcher.length
  // indexOf with a byte value is much faster than with a 1-byte Buffer, which matters for short lines
  const needle = matcherLength === 1 ? matcher[0]! : matcher
  // a multi-byte separator may straddle a chunk boundary, so we keep that many trailing bytes around
  const overlap = matcherLength - 1

  // Unterminated data is collected as a list of chunks and concatenated only once its separator arrives,
  // so a line spanning many chunks is copied once rather than on every chunk (linear, not quadratic).
  // Only that one line is copied: the rest of the chunk is scanned in place and emitted as views into it.
  let pending: Buffer[] = []
  let pendingLength = 0
  let edge: Buffer | undefined // last `overlap` bytes of pending data, only tracked when overlap > 0

  const transform = new Transform({
    writableObjectMode: false,
    writableHighWaterMark: 64 * 1024,
    readableObjectMode: true,

    transform(chunk: Buffer, _enc, cb) {
      // Deferred by a microtask, so that an async upstream (zlib, fs) can dispatch its next chunk to its thread
      // before we do the (synchronous) splitting + whatever the consumer does with the lines:
      // decompression of chunk N+1 then overlaps with processing of chunk N, measured +5-15% on gzip/zstd input.
      // Without it all of that runs inside the upstream's push, and the two never overlap.
      queueMicrotask(() => {
        // Whatever is thrown here (by a consumer most likely, as push() runs 'data' listeners synchronously)
        // must become a stream error, like it did when this ran inside transform() itself:
        // thrown from a microtask it would be an uncaught exception and crash the process.
        try {
          processChunk(chunk)
        } catch (err) {
          cb(err as Error)
          return
        }
        cb()
      })
    },

    flush(cb) {
      if (pendingLength > 0) {
        this.push(Buffer.concat(pending, pendingLength))
      }
      cb()
    },
  })

  function processChunk(chunk: Buffer): void {
    let start = 0

    if (pendingLength > 0) {
      // A multi-byte separator may straddle the chunk boundary: look for it in the last `overlap` bytes
      // of pending data followed by the first `overlap` bytes of this chunk
      const straddleIdx =
        overlap > 0 ? Buffer.concat([edge!, chunk.subarray(0, overlap)]).indexOf(matcher) : -1

      // Position of the first separator in chunk coordinates, negative when it started inside the pending data
      let idx: number
      if (straddleIdx === -1) {
        idx = chunk.indexOf(needle)
        if (idx === -1) {
          // No separator yet: keep accumulating without copying
          pending.push(chunk)
          pendingLength += chunk.length
          if (overlap > 0) {
            edge = Buffer.concat([edge!, chunk.subarray(-overlap)]).subarray(-overlap)
          }
          return
        }
      } else {
        idx = straddleIdx - edge!.length
      }

      // Complete the pending line with the head of this chunk
      if (idx > 0) pending.push(chunk.subarray(0, idx))
      const lineLength = pendingLength + idx
      if (lineLength > 0) {
        transform.push(Buffer.concat(pending, lineLength))
      }
      pending = []
      pendingLength = 0
      start = idx + matcherLength
    }

    let idx = chunk.indexOf(needle, start)
    while (idx !== -1) {
      if (idx > start) {
        transform.push(chunk.subarray(start, idx))
      }
      start = idx + matcherLength
      idx = chunk.indexOf(needle, start)
    }

    if (start < chunk.length) {
      const rest = chunk.subarray(start)
      pending.push(rest)
      pendingLength = rest.length
      if (overlap > 0) edge = rest.subarray(-overlap)
    }
  }

  return transform
}
