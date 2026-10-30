import { expect, it } from 'vitest'
import { zip2 } from './zip2.js'

it('should round-trip strings and buffers through deflate and inflate', async () => {
  const s = 'abcd1234$%^'

  // String
  let zippedBuf = await zip2.deflate(s)
  const unzippedStr = await zip2.inflateToString(zippedBuf)
  expect(unzippedStr).toBe(s)

  const sBuf = Buffer.from(s)
  zippedBuf = await zip2.deflate(sBuf)
  const unzippedBuf = await zip2.inflate(zippedBuf)
  expect(unzippedBuf).toEqual(sBuf)
})

it('should round-trip strings and buffers through zstd', async () => {
  const s = 'abcd1234$%^'

  let compressedBuf = await zip2.zstdCompress(s)
  const decompressedStr = await zip2.zstdDecompressToString(compressedBuf)
  expect(decompressedStr).toBe(s)

  const sBuf = Buffer.from(s)
  compressedBuf = await zip2.zstdCompress(sBuf)
  const decompressedBuf = await zip2.zstdDecompress(compressedBuf)
  expect(decompressedBuf).toEqual(sBuf)
})

it('should round-trip strings and buffers through sync zstd', () => {
  const s = 'abcd1234$%^'

  let compressedBuf = zip2.zstdCompressSync(s)
  const decompressedStr = zip2.zstdDecompressToStringSync(compressedBuf)
  expect(decompressedStr).toBe(s)

  const sBuf = Buffer.from(s)
  compressedBuf = zip2.zstdCompressSync(sBuf)
  const decompressedBuf = zip2.zstdDecompressSync(compressedBuf)
  expect(decompressedBuf).toEqual(sBuf)
})

it('should round-trip strings and buffers through gzip and gunzip', async () => {
  const s = 'abcd1234$%^'

  // String
  let zippedBuf = await zip2.gzip(s)
  const unzippedStr = await zip2.gunzipToString(zippedBuf)
  expect(unzippedStr).toBe(s)

  const sBuf = Buffer.from(s)
  zippedBuf = await zip2.gzip(sBuf)
  const unzippedBuf = await zip2.gunzip(zippedBuf)
  expect(unzippedBuf).toEqual(sBuf)
})

it('should detect zstd and gzip buffers and decompress zstd or deflate', async () => {
  const s = 'abcd1234$%^'
  const deflated = await zip2.deflate(s)
  const gzipped = await zip2.gzip(s)
  const zsted = await zip2.zstdCompress(s)

  expect(zip2.isZstdBuffer(deflated)).toBe(false)
  expect(zip2.isZstdBuffer(gzipped)).toBe(false)
  expect(zip2.isZstdBuffer(zsted)).toBe(true)

  expect(zip2.isGzipBuffer(deflated)).toBe(false)
  expect(zip2.isGzipBuffer(gzipped)).toBe(true)
  expect(zip2.isGzipBuffer(zsted)).toBe(false)

  // plain Uint8Array (not Buffer) is supported too
  const zstedU8 = new Uint8Array(zsted)
  expect(zip2.isZstdBuffer(zstedU8)).toBe(true)
  expect(zip2.isZstdBuffer(new Uint8Array(0))).toBe(false)
  expect(await zip2.decompressZstdOrInflateToString(zstedU8)).toBe(s)
  expect(zip2.decompressZstdOrInflateToStringSync(new Uint8Array(deflated))).toBe(s)

  expect(await zip2.decompressZstdOrInflateToString(deflated)).toBe(s)
  // expect(await decompressZstdOrInflateToString(gzipped)).toBe(s) // gzip is not supported
  expect(await zip2.decompressZstdOrInflateToString(zsted)).toBe(s)
})

it('should deflate to the same bytes as the Java implementation', async () => {
  const s = 'aa'
  const zippedBuf = await zip2.deflate(s)
  const bytes: number[] = []
  zippedBuf.forEach(c => bytes.push(c))
  // console.log(bytes)
  expect(bytes).toEqual([120, 156, 75, 76, 4, 0, 1, 37, 0, 195])
})
