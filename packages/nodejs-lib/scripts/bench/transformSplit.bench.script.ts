/*

pnpm --dir packages/nodejs-lib exec tsx scripts/bench/transformSplit.bench.script.ts

Benchmarks the current transformSplit / transformSplitOnNewline against the legacy implementation
(hand-rolled byte loop + Buffer.concat on every chunk), which is kept inline below for reproducibility.

The current implementation adopts the ideas of binary-split v2.0.0:
https://github.com/max-mapper/binary-split/releases/tag/v2.0.0
- native Buffer#indexOf (with a byte value for 1-byte separators)
- unterminated data is kept as a list of chunks and concatenated once, so a line spanning many chunks is linear
and goes one step further than upstream: only the line that straddles the chunk boundary is copied,
the rest of the chunk is scanned in place (upstream re-concatenates the whole chunk, which costs up to 2x on 10KB lines).

Results (Apple Silicon, Node 24.21, 64KB chunks, median of 5 runs, legacy transformSplitOnNewline = 1.00x):

  | Scenario                    | legacy    | current    | Speedup |
  |-----------------------------|-----------|------------|---------|
  | tiny lines (10B), \n        | 154 MB/s  | 113 MB/s   | 0.73x   |
  | short lines (22B), \n       | 286 MB/s  | 257 MB/s   | 0.90x   |
  | ndjson lines (~150B), \n    | 893 MB/s  | 1719 MB/s  | 1.92x   |
  | long lines (10KB), \n       | 963 MB/s  | 18734 MB/s | 19x     |
  | single 50MB line, \n        | 1752 ms   | 3.0 ms     | ~580x   |
  | short lines (23B), \r\n     | 157 MB/s  | 176 MB/s   | 1.12x   |
  | ndjson lines (~150B), \r\n  | 308 MB/s  | 1383 MB/s  | 4.5x    |

Native indexOf has a fixed per-call overhead that only pays off from ~64-byte lines, hence the known
regression on very short lines (a js-loop fast path for them was measured to fix it, but not kept for simplicity).
The 50MB line case is the quadratic Buffer.concat-on-every-chunk of the legacy implementation.
Upstream binary-split v2.0.0 itself measures the same as the current implementation.

*/

import type { Transform } from 'node:stream'
import { Readable, Transform as NodeTransform, Writable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { _range } from '@naturalcycles/js-lib/array/range.js'
import { comparators } from '@naturalcycles/js-lib/array/sort.js'
import { runScript } from '../../src/script/runScript.js'
import {
  transformSplit,
  transformSplitOnNewline,
} from '../../src/stream/transform/transformSplit.js'

const CHUNK_SIZE = 64 * 1024 // same as fs.createReadStream default and createReadStreamAsNDJson
const RUNS = 5

interface Scenario {
  name: string
  separator: string
  data: Buffer
  contenders: Contender[]
}

interface Contender {
  name: string
  create: (separator: string) => Transform
}

interface Result {
  contender: string
  medianMs: number
  mbPerSec: number
  linesPerSec: number
  lines: number
}

runScript(async () => {
  const newlineContenders: Contender[] = [
    { name: 'legacy transformSplitOnNewline', create: () => legacyTransformSplitOnNewline() },
    { name: 'legacy transformSplit', create: sep => legacyTransformSplit(sep) },
    { name: 'transformSplitOnNewline', create: () => transformSplitOnNewline() },
    { name: 'transformSplit', create: sep => transformSplit(sep) },
  ]
  const genericContenders: Contender[] = [
    { name: 'legacy transformSplit', create: sep => legacyTransformSplit(sep) },
    { name: 'transformSplit', create: sep => transformSplit(sep) },
  ]

  const scenarios: Scenario[] = [
    {
      name: 'tiny lines (10B), \\n',
      separator: '\n',
      data: Buffer.from('123456789\n'.repeat(4_000_000)),
      contenders: newlineContenders,
    },
    {
      name: 'short lines (22B), \\n',
      separator: '\n',
      data: Buffer.from('Hello beautiful world\n'.repeat(2_000_000)),
      contenders: newlineContenders,
    },
    {
      name: 'ndjson lines (~150B), \\n',
      separator: '\n',
      data: ndjson(300_000, '\n'),
      contenders: newlineContenders,
    },
    {
      name: 'long lines (10KB), \\n',
      separator: '\n',
      data: Buffer.from(('x'.repeat(10_000) + '\n').repeat(5000)),
      contenders: newlineContenders,
    },
    {
      name: 'single 50MB line, \\n',
      separator: '\n',
      data: Buffer.from('x'.repeat(50_000_000) + '\n'),
      contenders: newlineContenders,
    },
    {
      name: 'short lines (23B), \\r\\n',
      separator: '\r\n',
      data: Buffer.from('Hello beautiful world\r\n'.repeat(2_000_000)),
      contenders: genericContenders,
    },
    {
      name: 'ndjson lines (~150B), \\r\\n',
      separator: '\r\n',
      data: ndjson(300_000, '\r\n'),
      contenders: genericContenders,
    },
  ]

  console.log(
    `node ${process.version}, chunk size ${CHUNK_SIZE / 1024}KB, median of ${RUNS} runs\n`,
  )

  for (const scenario of scenarios) {
    const results = await runScenario(scenario)
    printResults(scenario, results)
  }
})

async function runScenario(scenario: Scenario): Promise<Result[]> {
  const chunks = chunkify(scenario.data, CHUNK_SIZE)
  const results: Result[] = []

  for (const contender of scenario.contenders) {
    await measure(contender, scenario.separator, chunks) // warmup
    const runs: number[] = []
    let lines = 0
    for (const _ of _range(RUNS)) {
      const r = await measure(contender, scenario.separator, chunks)
      runs.push(r.ms)
      lines = r.lines
    }
    const medianMs = runs.toSorted(comparators.numericAsc)[Math.floor(RUNS / 2)]!
    results.push({
      contender: contender.name,
      medianMs,
      mbPerSec: scenario.data.length / 1024 / 1024 / (medianMs / 1000),
      linesPerSec: lines / (medianMs / 1000),
      lines,
    })
  }

  // all contenders must agree on the output
  const lineCounts = new Set(results.map(r => r.lines))
  if (lineCounts.size !== 1) {
    throw new Error(`line count mismatch in "${scenario.name}": ${JSON.stringify(results)}`)
  }

  return results
}

async function measure(
  contender: Contender,
  separator: string,
  chunks: Buffer[],
): Promise<{ ms: number; lines: number }> {
  let lines = 0
  const start = performance.now()
  await pipeline(
    Readable.from(chunks, { objectMode: false }),
    contender.create(separator),
    new Writable({
      objectMode: true,
      highWaterMark: 1000,
      write(_chunk, _enc, cb) {
        lines++
        cb()
      },
    }),
  )
  return { ms: performance.now() - start, lines }
}

function printResults(scenario: Scenario, results: Result[]): void {
  const baseline = results[0]!
  console.log(
    `${scenario.name}: ${(scenario.data.length / 1024 / 1024).toFixed(0)}MB, ${baseline.lines} lines`,
  )
  console.table(
    results.map(r => ({
      contender: r.contender,
      'median ms': r.medianMs.toFixed(1),
      'MB/s': r.mbPerSec.toFixed(0),
      'Mlines/s': (r.linesPerSec / 1e6).toFixed(2),
      'vs baseline': `${(baseline.medianMs / r.medianMs).toFixed(2)}x`,
    })),
  )
}

function ndjson(lines: number, separator: string): Buffer {
  const rows = _range(lines).map(i =>
    JSON.stringify({
      id: `id_${i}`,
      created: 1_700_000_000 + i,
      updated: 1_700_000_000 + i * 2,
      name: `User number ${i}`,
      email: `user${i}@example.com`,
      tags: ['a', 'b', 'c'],
      nested: { x: i % 7, y: i % 11, z: 'some text here' },
    }),
  )
  return Buffer.from(rows.join(separator) + separator)
}

function chunkify(buf: Buffer, size: number): Buffer[] {
  const chunks: Buffer[] = []
  for (let i = 0; i < buf.length; i += size) {
    chunks.push(buf.subarray(i, i + size))
  }
  return chunks
}

/*
 * Legacy implementation (as it was before adopting binary-split v2 ideas), kept verbatim for comparison.
 */

function legacyTransformSplitOnNewline(): Transform {
  let buffered: Buffer | undefined

  return new NodeTransform({
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
        const idx = legacyFirstNewlineMatch(buf, offset)
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

function legacyTransformSplit(separator = '\n'): Transform {
  const matcher = Buffer.from(separator)
  let buffered: Buffer | undefined

  return new NodeTransform({
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
        const idx = legacyFirstMatch(buf, offset - matcher.length + 1, matcher)
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

const NEWLINE_CODE = 10

function legacyFirstNewlineMatch(buf: Buffer, offset: number): number {
  const bufLength = buf.length
  if (offset >= bufLength) return -1
  for (let i = offset; i < bufLength; i++) {
    if (buf[i] === NEWLINE_CODE) {
      return i
    }
  }
  return -1
}

function legacyFirstMatch(buf: Buffer, offset: number, matcher: Buffer): number {
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
