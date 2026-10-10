import type { Transform } from 'node:stream'
import { Readable, Writable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { _range } from '@naturalcycles/js-lib/array/range.js'
import { expect, test } from 'vitest'
import { Pipeline } from '../pipeline.js'
import { transformSplit, transformSplitOnNewline } from './transformSplit.js'

test('splits a single chunk on newline', async () => {
  expect(await splitChunks(transformSplitOnNewline(), ['a\nbb\nccc\n'])).toEqual(['a', 'bb', 'ccc'])
})

test('flushes trailing data without a newline', async () => {
  expect(await splitChunks(transformSplitOnNewline(), ['a\nb'])).toEqual(['a', 'b'])
})

test('skips empty lines', async () => {
  expect(await splitChunks(transformSplitOnNewline(), ['\n\na\n\n\nb\n\n'])).toEqual(['a', 'b'])
})

test('emits nothing for empty input', async () => {
  expect(await splitChunks(transformSplitOnNewline(), [])).toEqual([])
  expect(await splitChunks(transformSplitOnNewline(), ['', '\n', '\n\n'])).toEqual([])
})

test('emits Buffers', async () => {
  const t = transformSplitOnNewline()
  const resultPromise = t.toArray()
  t.end('a\nb')
  const lines = await resultPromise
  expect(lines).toHaveLength(2)
  for (const line of lines) {
    expect(Buffer.isBuffer(line)).toBe(true)
  }
})

test('accepts string and Buffer chunks', async () => {
  expect(await splitChunks(transformSplitOnNewline(), ['a\n', Buffer.from('b\n'), 'c'])).toEqual([
    'a',
    'b',
    'c',
  ])
})

test('joins a line split across chunks', async () => {
  expect(await splitChunks(transformSplitOnNewline(), ['ab', 'c\nd', 'e\n', 'f'])).toEqual([
    'abc',
    'de',
    'f',
  ])
})

test('joins a long line spanning many chunks', async () => {
  const long = 'x'.repeat(1_000_000)
  const chunks = chunkify(Buffer.from(`${long}\ny`), 1024)
  expect(chunks.length).toBeGreaterThan(900)
  const lines = await splitChunks(transformSplitOnNewline(), chunks)
  expect(lines).toHaveLength(2)
  expect(lines[0]).toBe(long)
  expect(lines[1]).toBe('y')
})

test('every chunking gives the same result (newline, multibyte utf8 content)', async () => {
  const text = '\nhéllo\n\nwörld\r\n🙂\n\n\nlast'
  const buf = Buffer.from(text)
  const expected = referenceSplit(text, '\n')
  expect(expected).toEqual(['héllo', 'wörld\r', '🙂', 'last'])

  for (const size of _range(1, buf.length + 1)) {
    expect(
      await splitChunks(transformSplitOnNewline(), chunkify(buf, size)),
      `size=${size}`,
    ).toEqual(expected)
    expect(await splitChunks(transformSplit('\n'), chunkify(buf, size)), `size=${size}`).toEqual(
      expected,
    )
  }
})

test('transformSplit with a 1-byte custom separator', async () => {
  expect(await splitChunks(transformSplit(';'), ['a;b', ';;c;'])).toEqual(['a', 'b', 'c'])
})

test('transformSplit with a 2-byte separator across chunk boundaries', async () => {
  const text = 'a\r\nbb\r\n\r\nc\rd\ne\r\n\r'
  const buf = Buffer.from(text)
  const expected = referenceSplit(text, '\r\n')
  expect(expected).toEqual(['a', 'bb', 'c\rd\ne', '\r'])

  for (const size of _range(1, buf.length + 1)) {
    expect(await splitChunks(transformSplit('\r\n'), chunkify(buf, size)), `size=${size}`).toEqual(
      expected,
    )
  }
})

test('transformSplit with a 3-byte separator across chunk boundaries', async () => {
  const text = '<|x<|>yy<|><|>z<|<|>|>'
  const buf = Buffer.from(text)
  const expected = referenceSplit(text, '<|>')
  expect(expected).toEqual(['<|x', 'yy', 'z<|', '|>'])

  for (const size of _range(1, buf.length + 1)) {
    expect(await splitChunks(transformSplit('<|>'), chunkify(buf, size)), `size=${size}`).toEqual(
      expected,
    )
  }
})

test('transformSplit with a multi-byte separator and a long line spanning many chunks', async () => {
  const long = 'x\r'.repeat(100_000) // many partial separators inside the line
  const chunks = chunkify(Buffer.from(`${long}\r\ny\r\n`), 777)
  const lines = await splitChunks(transformSplit('\r\n'), chunks)
  expect(lines).toEqual([long, 'y'])
})

test('deterministic fuzz: random line lengths, random chunk sizes', async () => {
  const rnd = lcg(42)
  const lines = _range(2000).map(() => 'abcdefghij'.repeat(rnd(0, 30)).slice(0, rnd(0, 300)))

  for (const separator of ['\n', '\r\n', '<|>']) {
    const text = lines.join(separator) + (rnd(0, 2) ? separator : '')
    const buf = Buffer.from(text)
    const expected = referenceSplit(text, separator)

    for (const size of [1, 2, 3, 5, 7, 64, 1000, 65536]) {
      expect(
        await splitChunks(transformSplit(separator), chunkify(buf, size)),
        `size=${size}`,
      ).toEqual(expected)
    }
  }
})

test('transformSplit throws on empty separator', () => {
  expect(() => transformSplit('')).toThrow('separator')
})

test('a synchronous throw while a line is consumed becomes a stream error', async () => {
  // chunk processing is deferred to a microtask, where an unhandled throw would crash the process
  const t = transformSplitOnNewline()
  t.on('data', (line: Buffer) => {
    if (line.toString() === 'b') throw new Error('boom')
  })
  await expect(
    pipeline(
      Readable.from([Buffer.from('a\nb\nc\n')], { objectMode: false }),
      t,
      new Writable({ objectMode: true, write: (_chunk, _enc, cb) => cb() }),
    ),
  ).rejects.toThrow('boom')
})

test('works inside Pipeline.splitOnNewline', async () => {
  const chunks = chunkify(Buffer.from('{"a":1}\n{"b":2}\n{"c":3}'), 5)
  const lines = await Pipeline.from<Uint8Array>(Readable.from(chunks, { objectMode: false }))
    .splitOnNewline()
    .toArray()
  expect(lines.map(String)).toEqual(['{"a":1}', '{"b":2}', '{"c":3}'])
})

async function splitChunks(t: Transform, chunks: (string | Buffer)[]): Promise<string[]> {
  const resultPromise = t.toArray()
  for (const chunk of chunks) t.write(chunk)
  t.end()
  return (await resultPromise).map(String)
}

function chunkify(buf: Buffer, size: number): Buffer[] {
  const chunks: Buffer[] = []
  for (let i = 0; i < buf.length; i += size) {
    chunks.push(buf.subarray(i, i + size))
  }
  return chunks
}

function referenceSplit(text: string, separator: string): string[] {
  return text.split(separator).filter(Boolean)
}

/**
 * Tiny seeded PRNG (linear congruential generator), returns integers in [min, max).
 */
function lcg(seed: number): (min: number, max: number) => number {
  let state = seed
  return (min, max) => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648
    return min + (state % (max - min))
  }
}
