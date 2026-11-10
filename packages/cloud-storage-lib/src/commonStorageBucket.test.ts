import { zip2 } from '@naturalcycles/nodejs-lib/zip'
import { describe, expect, it } from 'vitest'
import { CommonStorageBucket } from './commonStorageBucket.js'
import { InMemoryCommonStorage } from './inMemoryCommonStorage.js'

const bucketName = 'b'
const content = { a: 'a', n: 1, nested: { list: [1, 2, 3] } }
const metadata = { hash: 'hash_1' }

describe('getFileAsJson', () => {
  it('should not decompress a zstd-compressed file', async () => {
    const bucket = new CommonStorageBucket({ storage: new InMemoryCommonStorage(), bucketName })
    await bucket.saveZstdJsonFile('a/1.json.zst', content)

    await expect(bucket.getFileAsJson('a/1.json.zst')).rejects.toThrow(SyntaxError)
  })
})

describe('getFileAsAutoDecompressedJson', () => {
  it('should read zstd, gzip and plain JSON files', async () => {
    const bucket = new CommonStorageBucket({ storage: new InMemoryCommonStorage(), bucketName })
    const paths = await saveZstdGzipAndPlainJsonFiles(bucket)

    for (const path of paths) {
      expect(await bucket.getFileAsAutoDecompressedJson(path)).toEqual(content)
    }
  })

  it('should return null when the file does not exist', async () => {
    const bucket = new CommonStorageBucket({ storage: new InMemoryCommonStorage(), bucketName })

    expect(await bucket.getFileAsAutoDecompressedJson('a/missing.json.zst')).toBeNull()
  })

  it('should throw when a compressed file is corrupted', async () => {
    const bucket = new CommonStorageBucket({ storage: new InMemoryCommonStorage(), bucketName })
    const payload = await zip2.zstdCompress(JSON.stringify(content))
    await bucket.saveFile('a/1.json.zst', payload.subarray(0, payload.length - 4))

    const promise = bucket.getFileAsAutoDecompressedJson('a/1.json.zst')
    await expect(promise).rejects.toThrow('unexpected end of file')
  })
})

describe('requireFileAsAutoDecompressedJson', () => {
  it('should read zstd, gzip and plain JSON files', async () => {
    const bucket = new CommonStorageBucket({ storage: new InMemoryCommonStorage(), bucketName })
    const paths = await saveZstdGzipAndPlainJsonFiles(bucket)

    for (const path of paths) {
      expect(await bucket.requireFileAsAutoDecompressedJson(path)).toEqual(content)
    }
  })

  it('should throw when the file does not exist', async () => {
    const bucket = new CommonStorageBucket({ storage: new InMemoryCommonStorage(), bucketName })

    const promise = bucket.requireFileAsAutoDecompressedJson('a/missing.json.zst')
    await expect(promise).rejects.toMatchObject({ data: { code: 'FILE_REQUIRED' } })
  })
})

describe('saveZstdJsonFile', () => {
  it('should save a zstd-compressed JSON file with metadata', async () => {
    const storage = new InMemoryCommonStorage()
    const bucket = new CommonStorageBucket({ storage, bucketName })

    await bucket.saveZstdJsonFile('a/1.json.zst', content, { metadata })

    const raw = await storage.getFile(bucketName, 'a/1.json.zst')
    expect(zip2.isZstdBuffer(raw!)).toBe(true)
    expect((await bucket.getFileMetadata('a/1.json.zst'))!.metadata).toEqual(metadata)
  })
})

async function saveZstdGzipAndPlainJsonFiles(bucket: CommonStorageBucket): Promise<string[]> {
  await bucket.saveZstdJsonFile('a/1.json.zst', content)
  await bucket.saveFile('a/2.json.gz', await zip2.gzip(JSON.stringify(content)))
  await bucket.saveJsonFile('a/3.json', content)
  return ['a/1.json.zst', 'a/2.json.gz', 'a/3.json']
}
