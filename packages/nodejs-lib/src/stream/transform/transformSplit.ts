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

  // Unterminated data is collected as a list of chunks and concatenated only once a separator arrives,
  // so a long line spanning many chunks is copied once rather than on every chunk (linear, not quadratic)
  let pending: Buffer[] = []
  let pendingLength = 0
  let edge: Buffer | undefined // last `overlap` bytes of pending data, only tracked when overlap > 0

  return new Transform({
    writableObjectMode: false,
    writableHighWaterMark: 64 * 1024,
    readableObjectMode: true,

    transform(chunk: Buffer, _enc, cb) {
      let buf = chunk
      let offset = 0

      if (pendingLength > 0) {
        const straddles =
          overlap > 0 && Buffer.concat([edge!, chunk.subarray(0, overlap)]).includes(matcher)
        const idxInChunk = straddles ? -1 : chunk.indexOf(needle)
        if (!straddles && idxInChunk === -1) {
          // No separator yet: keep accumulating without copying
          pending.push(chunk)
          pendingLength += chunk.length
          if (overlap > 0) {
            edge = Buffer.concat([edge!, chunk.subarray(-overlap)]).subarray(-overlap)
          }
          cb()
          return
        }
        pending.push(chunk)
        buf = Buffer.concat(pending, pendingLength + chunk.length)
        // Start scanning where the first separator can possibly be
        offset = straddles ? Math.max(0, pendingLength - overlap) : pendingLength + idxInChunk
        pending = []
        pendingLength = 0
      }

      let start = 0
      let idx = buf.indexOf(needle, offset)
      while (idx !== -1) {
        if (idx > start) {
          this.push(buf.subarray(start, idx))
        }
        start = idx + matcherLength
        idx = buf.indexOf(needle, start)
      }

      if (start < buf.length) {
        const rest = buf.subarray(start)
        pending.push(rest)
        pendingLength = rest.length
        if (overlap > 0) edge = rest.subarray(-overlap)
      }

      cb()
    },

    flush(cb) {
      if (pendingLength > 0) {
        this.push(Buffer.concat(pending, pendingLength))
      }
      cb()
    },
  })
}
