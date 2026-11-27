import { once } from 'node:events'
import { Readable } from 'node:stream'
import { getDefaultCloudStorage } from '@naturalcycles/cloud-storage-lib'
import { _range } from '@naturalcycles/js-lib/array/range.js'
import { pDelay } from '@naturalcycles/js-lib/promise'
import { expect, it, vi } from 'vitest'
import { fs2 } from '../fs/fs2.js'
import { tmpDir } from '../test/paths.cnst.js'
import { zip2 } from '../zip/zip2.js'
import { createReadStreamAsNDJson } from './ndjson/createReadStreamAsNDJson.js'
import { Pipeline } from './pipeline.js'

// Tests run with APP_ENV=test, so it is an InMemoryCommonStorage: the same instance that Pipeline uses
const storage = await getDefaultCloudStorage()

const rows = _range(5).map(i => ({ id: i, name: `row ${i}` }))
const ndjson = rows.map(r => JSON.stringify(r)).join('\n') + '\n'
const content = Buffer.from('binary content')

it.each(['rows.ndjson', 'rows.ndjson.gz', 'rows.ndjson.zst'])(
  'should write %s to a gs:// url and read it back',
  async fileName => {
    const url = `gs://bucket1/roundtrip/${fileName}`

    await Pipeline.fromArray(rows).toNDJsonFile(url)

    expect(await Pipeline.fromNDJsonFile<(typeof rows)[number]>(url).toArray()).toEqual(rows)
  },
)

it('should compress a gs:// file according to its extension', async () => {
  await Pipeline.fromArray(rows).toNDJsonFile('gs://bucket1/compress/rows.ndjson')
  await Pipeline.fromArray(rows).toNDJsonFile('gs://bucket1/compress/rows.ndjson.gz')
  await Pipeline.fromArray(rows).toNDJsonFile('gs://bucket1/compress/rows.ndjson.zst')

  const plain = await storage.getFile('bucket1', 'compress/rows.ndjson')
  const gz = await storage.getFile('bucket1', 'compress/rows.ndjson.gz')
  const zst = await storage.getFile('bucket1', 'compress/rows.ndjson.zst')

  expect(plain!.toString()).toBe(ndjson)
  expect(zip2.gunzipToStringSync(gz!)).toBe(ndjson)
  expect(zip2.zstdDecompressToStringSync(zst!)).toBe(ndjson)
})

it('should limit the rows of a gs:// ndjson file with limitSource', async () => {
  await storage.saveFile('bucket1', 'limit/rows.ndjson.gz', zip2.gzipSync(ndjson))

  const result = await Pipeline.fromNDJsonFile('gs://bucket1/limit/rows.ndjson.gz')
    .limitSource(2)
    .toArray()

  expect(result).toEqual(rows.slice(0, 2))
})

it('should destroy the storage stream when the consumer of a gs:// file stops early', async () => {
  // An endless file: it only stops when it is destroyed
  const source = Readable.from(endlessNDJson(), { objectMode: false })
  vi.spyOn(storage, 'getFileReadStream').mockReturnValueOnce(Pipeline.from(source) as any)

  const result = await Pipeline.fromNDJsonFile('gs://bucket1/endless.ndjson')
    .limitSource(2)
    .toArray()

  expect(result).toEqual([{ id: 0 }, { id: 1 }])
  if (!source.destroyed) await once(source, 'close')
  expect(source.destroyed).toBe(true)
})

it('should read a gs:// ndjson file with createReadStreamAsNDJson', async () => {
  await storage.saveFile('bucket1', 'readStream/rows.ndjson', Buffer.from(ndjson))

  expect(await createReadStreamAsNDJson('gs://bucket1/readStream/rows.ndjson').toArray()).toEqual(
    rows,
  )
})

it('should copy a binary file between gs:// urls with fromFile and toFile', async () => {
  await storage.saveFile('bucket1', 'binary/a.bin', content)

  await Pipeline.fromFile('gs://bucket1/binary/a.bin').toFile('gs://bucket2/binary/b.bin')

  expect(await storage.getFile('bucket2', 'binary/b.bin')).toEqual(content)
})

it('should read a binary file with fromCloudStorageFile', async () => {
  await storage.saveFile('bucket1', 'binary/c.bin', content)

  const chunks = await Pipeline.fromCloudStorageFile('gs://bucket1/binary/c.bin').toArray()

  expect(Buffer.concat(chunks)).toEqual(content)
})

it('should reject when the gs:// file does not exist', async () => {
  await expect(
    Pipeline.fromFile('gs://bucket1/missing.bin').toArray(),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[AssertionError: getFileReadStream file not found: bucket1/missing.bin]`,
  )

  await expect(
    Pipeline.fromNDJsonFile('gs://bucket1/missing.ndjson.zst').toArray(),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[AssertionError: getFileReadStream file not found: bucket1/missing.ndjson.zst]`,
  )
})

it('should reject, and not crash, when a gs:// read fails before the consumer is attached', async () => {
  failBeforeTheStorageStreamExists()
  const pipeline = Pipeline.fromFile('gs://bucket1/any.bin')

  // The read fails during this delay, while nothing listens to the source
  await pDelay(20)

  await expect(pipeline.toArray()).rejects.toThrow('storage failure')
})

it('should reject, and not crash, when both the gs:// source and the gs:// destination fail', async () => {
  failBeforeTheStorageStreamExists()

  await expect(
    Pipeline.fromFile('gs://bucket1/any.bin').toFile('gs://bucket-only'),
  ).rejects.toThrow('Cloud Storage url should look like')

  // The source fails around the rejection above: an unhandled 'error' event would fail the test run
  await pDelay(20)
})

it('should throw synchronously on a gs:// url without a file path', () => {
  expect(() => Pipeline.fromFile('gs://bucket-only')).toThrowErrorMatchingInlineSnapshot(
    `[AssertionError: Cloud Storage url should look like gs://bucket/path/to/file but got: gs://bucket-only]`,
  )
  expect(() => Pipeline.fromNDJsonFile('gs://bucket1/')).toThrowErrorMatchingInlineSnapshot(
    `[AssertionError: Cloud Storage url should look like gs://bucket/path/to/file but got: gs://bucket1/]`,
  )
})

it('should reject toFile on a gs:// url without a file path, and close the source', async () => {
  const source = Readable.from([content], { objectMode: false })

  await expect(
    Pipeline.from(source).toFile('gs://bucket-only'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[AssertionError: Cloud Storage url should look like gs://bucket/path/to/file but got: gs://bucket-only]`,
  )

  expect(source.destroyed).toBe(true)
})

it('should close the source when toNDJsonFile cannot create the gs:// destination', async () => {
  const source = Readable.from(rows)

  await expect(Pipeline.from(source).toNDJsonFile('gs://bucket-only')).rejects.toThrow(
    'Cloud Storage url should look like',
  )

  expect(source.destroyed).toBe(true)
})

it('should write and read back ndjson with the Cloud Storage only methods', async () => {
  const url = 'gs://bucket1/explicit/rows.ndjson.zst'

  await Pipeline.fromArray(rows).toCloudStorageNDJsonFile(url)

  expect(await Pipeline.fromCloudStorageNDJsonFile(url).toArray()).toEqual(rows)
  const file = await storage.getFile('bucket1', 'explicit/rows.ndjson.zst')
  expect(zip2.zstdDecompressToStringSync(file!)).toBe(ndjson)
})

it('should write and read back a binary file with the Cloud Storage only methods', async () => {
  const url = 'gs://bucket1/explicit/a.bin'

  await Pipeline.fromArray([content]).setObjectMode(false).toCloudStorageFile(url)

  const chunks = await Pipeline.fromCloudStorageFile(url).toArray()
  expect(Buffer.concat(chunks)).toEqual(content)
})

it('should throw from fromCloudStorageFile and fromCloudStorageNDJsonFile on a local path', () => {
  expect(() => Pipeline.fromCloudStorageFile('/tmp/a.bin')).toThrowErrorMatchingInlineSnapshot(
    `[AssertionError: Cloud Storage url should start with gs:// but got: /tmp/a.bin]`,
  )
  expect(() =>
    Pipeline.fromCloudStorageNDJsonFile('/tmp/rows.ndjson'),
  ).toThrowErrorMatchingInlineSnapshot(
    `[AssertionError: Cloud Storage url should start with gs:// but got: /tmp/rows.ndjson]`,
  )
})

it('should reject toCloudStorageFile on a local path, write nothing, and close the source', async () => {
  const source = Readable.from([content], { objectMode: false })
  const path = `${tmpDir}/toCloudStorageFile.bin`

  await expect(Pipeline.from(source).toCloudStorageFile(path)).rejects.toThrow(
    'Cloud Storage url should start with gs://',
  )

  expect(source.destroyed).toBe(true)
  expect(fs2.pathExists(path)).toBe(false)
})

it('should reject toCloudStorageNDJsonFile on a local path, write nothing, and close the source', async () => {
  const source = Readable.from(rows)
  const path = `${tmpDir}/toCloudStorageNDJsonFile.ndjson`

  await expect(Pipeline.from(source).toCloudStorageNDJsonFile(path)).rejects.toThrow(
    'Cloud Storage url should start with gs://',
  )

  expect(source.destroyed).toBe(true)
  expect(fs2.pathExists(path)).toBe(false)
})

/**
 * Simulates a failure that happens before the storage stream is created,
 * e.g. when cloud-storage-lib is not installed.
 * Such a failure reaches the source Readable directly, and not through a stream pipeline.
 */
function failBeforeTheStorageStreamExists(): void {
  vi.spyOn(storage, 'getFileReadStream').mockImplementationOnce(() => {
    throw new Error('storage failure')
  })
}

function* endlessNDJson(): Generator<string> {
  for (let id = 0; ; id++) {
    yield `{"id":${id}}\n`
  }
}
