import { Transform } from 'node:stream'
import type { TransformTyped } from '../stream.model.js'

// The code below is carefully adopted from: https://github.com/max-mapper/binary-split

/**
 * Transforms input Buffer/string stream into Buffer chunks (objectMode: true) split by newLine.
 *
 * Useful for reading NDJSON files from fs.
 *
 * Same as binarySplit, but optimized (hard-coded) to split on NEWLINE (aka `\n`).
 * (+5-10% _pipeline speedup measured, compared to generic `binarySplit` on variable length delimiter)
 */
export function transformSplitOnNewline(): TransformTyped<Buffer, Buffer> {
  let buffered: Buffer | undefined

  return new Transform({
    writableObjectMode: false,
    writableHighWaterMark: 64 * 1024,
    readableObjectMode: true,

    transform(buf: Buffer, _enc, cb) {
      let offset = 0
      let lastMatch = 0
      if (buffered) {
        buf = Buffer.concat([buffered, buf])
        offset = buffered.length
        buffered = undefined
      }

      while (true) {
        const idx = firstNewlineMatch(buf, offset)
        if (idx !== -1 && idx < buf.length) {
          if (lastMatch !== idx) {
            this.push(buf.slice(lastMatch, idx))
          }
          offset = idx + 1
          lastMatch = offset
        } else {
          buffered = buf.slice(lastMatch)
          break
        }
      }

      cb()
    },

    flush(done) {
      if (buffered && buffered.length > 0) this.push(buffered)
      done()
    },
  })
}

/**
 * Input: stream (objectMode=false) of arbitrary string|Buffer chunks, like when read from fs
 * Output: stream (objectMode=true) or string|Buffer chunks split by `separator` (@default to `\n`)
 *
 * Please use slightly more optimized `transformSplitOnNewline` for NDJSON file parsing.
 * (+5-10% _pipeline speedup measured!)
 */
export function transformSplit(separator = '\n'): TransformTyped<Buffer, Buffer> {
  const matcher = Buffer.from(separator)
  let buffered: Buffer | undefined

  return new Transform({
    readableObjectMode: true,
    writableHighWaterMark: 64 * 1024,

    transform(buf: Buffer, _enc, done) {
      let offset = 0
      let lastMatch = 0
      if (buffered) {
        buf = Buffer.concat([buffered, buf])
        offset = buffered.length
        buffered = undefined
      }

      while (true) {
        const idx = firstMatch(buf, offset - matcher.length + 1, matcher)
        if (idx !== -1 && idx < buf.length) {
          if (lastMatch !== idx) {
            this.push(buf.slice(lastMatch, idx))
          }
          offset = idx + matcher.length
          lastMatch = offset
        } else {
          buffered = buf.slice(lastMatch)
          break
        }
      }

      done()
    },

    flush(done) {
      if (buffered && buffered.length > 0) this.push(buffered)
      done()
    },
  })
}

// const NEWLINE = Buffer.from('\n')
// const NEWLINE_CODE = NEWLINE[0]! // it is `10`
const NEWLINE_CODE = 10

/**
 * Same as firstMatch, but optimized (hard-coded) to find NEWLINE (aka `\n`).
 */
function firstNewlineMatch(buf: Buffer, offset: number): number {
  const bufLength = buf.length
  if (offset >= bufLength) return -1
  for (let i = offset; i < bufLength; i++) {
    if (buf[i] === NEWLINE_CODE) {
      return i
    }
  }
  return -1 // this code is unreachable, because i is guaranteed to be found in the loop above
}

function firstMatch(buf: Buffer, offset: number, matcher: Buffer): number {
  if (offset >= buf.length) return -1
  let i: number
  for (i = offset; i < buf.length; i++) {
    if (buf[i] === matcher[0]) {
      if (matcher.length > 1) {
        let fullMatch = true
        let j = i
        for (let k = 0; j < i + matcher.length; j++, k++) {
          if (buf[j] !== matcher[k]) {
            fullMatch = false
            break
          }
        }
        if (fullMatch) return j - matcher.length
      } else {
        break
      }
    }
  }

  return i + matcher.length - 1
}
