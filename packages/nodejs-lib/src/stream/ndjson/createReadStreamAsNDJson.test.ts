import { Readable } from 'node:stream'
import { _range } from '@naturalcycles/js-lib/array/range.js'
import { beforeEach, expect, test, vi } from 'vitest'
import { fs2 } from '../../fs/fs2.js'
import { zip2 } from '../../zip/zip2.js'
import { Pipeline } from '../pipeline.js'
import { createReadStreamAsNDJson } from './createReadStreamAsNDJson.js'

const rows = _range(5).map(i => ({ id: i, name: `row ${i}` }))
const ndjson = rows.map(r => JSON.stringify(r)).join('\n') + '\n'
const gz = zip2.gzipSync(ndjson)

// "Files" served from memory by stubbing fs2, nothing is written to disk
const files: Record<string, Buffer> = {
  'rows.ndjson': Buffer.from(ndjson),
  'rows.ndjson.gz': gz,
  'rows.ndjson.zst': zip2.zstdCompressSync(ndjson),
  'badJson.ndjson': Buffer.from('{"id":1}\n{not json\n{"id":3}\n'),
  'corrupt.ndjson.gz': Buffer.concat([
    gz.subarray(0, 20),
    Buffer.from('garbage garbage garbage garbage'),
  ]),
  'truncated.ndjson.gz': gz.subarray(0, Math.floor(gz.length / 2)),
  'notGzip.ndjson.gz': Buffer.from(ndjson),
  'corrupt.ndjson.zst': Buffer.from('definitely not zstd'),
}

const requireFileToExist = fs2.requireFileToExist.bind(fs2)

beforeEach(() => {
  // in-memory files pass the existence check, anything else goes through the real one
  vi.spyOn(fs2, 'requireFileToExist').mockImplementation(path => {
    if (!files[path]) requireFileToExist(path)
  })
  vi.spyOn(fs2, 'createReadStream').mockImplementation(
    path => Readable.from([files[path as string]!], { objectMode: false }) as any,
  )
})

test('reads a plain ndjson file', async () => {
  expect(await createReadStreamAsNDJson('rows.ndjson').toArray()).toEqual(rows)
})

test('reads a gzipped ndjson file', async () => {
  expect(await createReadStreamAsNDJson('rows.ndjson.gz').toArray()).toEqual(rows)
})

test('reads a zstd-compressed ndjson file', async () => {
  expect(await createReadStreamAsNDJson('rows.ndjson.zst').toArray()).toEqual(rows)
})

test('supports .take(limit)', async () => {
  expect(await createReadStreamAsNDJson('rows.ndjson.gz').take(2).toArray()).toEqual(
    rows.slice(0, 2),
  )
})

test('throws synchronously on a missing file', () => {
  expect(() => createReadStreamAsNDJson('missing.ndjson')).toThrow('Required file should exist')
})

test('rejects on an invalid json line', async () => {
  await expect(createReadStreamAsNDJson('badJson.ndjson').toArray()).rejects.toThrow(SyntaxError)
})

// The following used to crash the process with an unhandled 'error' event,
// because `.pipe` does not forward errors from the decompression stream
test('rejects on a corrupt gzip file', async () => {
  await expect(createReadStreamAsNDJson('corrupt.ndjson.gz').toArray()).rejects.toThrow(
    'invalid distance too far back',
  )
})

test('rejects on a truncated gzip file', async () => {
  await expect(createReadStreamAsNDJson('truncated.ndjson.gz').toArray()).rejects.toThrow(
    'unexpected end of file',
  )
})

test('rejects on a .gz file that is not gzip', async () => {
  await expect(createReadStreamAsNDJson('notGzip.ndjson.gz').toArray()).rejects.toThrow(
    'incorrect header check',
  )
})

test('rejects on a corrupt zstd file', async () => {
  await expect(createReadStreamAsNDJson('corrupt.ndjson.zst').toArray()).rejects.toThrow(
    'Unknown frame descriptor',
  )
})

test('works with Pipeline.fromNDJsonFile and limitSource', async () => {
  expect(await Pipeline.fromNDJsonFile('rows.ndjson.gz').limitSource(3).toArray()).toEqual(
    rows.slice(0, 3),
  )
})

test('Pipeline.fromNDJsonFile rejects on a corrupt gzip file', async () => {
  await expect(Pipeline.fromNDJsonFile('corrupt.ndjson.gz').toArray()).rejects.toThrow(
    'invalid distance too far back',
  )
})
