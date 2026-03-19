import { expect, test } from 'vitest'
import { zip2 } from './zip2.js'

test('deflate/inflate', async () => {
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

test('zstd compress/decompress', async () => {
  const s = 'abcd1234$%^'

  let compressedBuf = await zip2.zstdCompress(s)
  const decompressedStr = await zip2.zstdDecompressToString(compressedBuf)
  expect(decompressedStr).toBe(s)

  const sBuf = Buffer.from(s)
  compressedBuf = await zip2.zstdCompress(sBuf)
  const decompressedBuf = await zip2.zstdDecompress(compressedBuf)
  expect(decompressedBuf).toEqual(sBuf)
})

test('zstd compress/decompress sync', () => {
  const s = 'abcd1234$%^'

  let compressedBuf = zip2.zstdCompressSync(s)
  const decompressedStr = zip2.zstdDecompressToStringSync(compressedBuf)
  expect(decompressedStr).toBe(s)

  const sBuf = Buffer.from(s)
  compressedBuf = zip2.zstdCompressSync(sBuf)
  const decompressedBuf = zip2.zstdDecompressSync(compressedBuf)
  expect(decompressedBuf).toEqual(sBuf)
})

test('gzip/gunzip', async () => {
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

test('compression detection', async () => {
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

  expect(await zip2.decompressZstdOrInflateToString(deflated)).toBe(s)
  // expect(await decompressZstdOrInflateToString(gzipped)).toBe(s) // gzip is not supported
  expect(await zip2.decompressZstdOrInflateToString(zsted)).toBe(s)
})

test('compatible with java impl', async () => {
  const s = 'aa'
  const zippedBuf = await zip2.deflate(s)
  const bytes: number[] = []
  zippedBuf.forEach(c => bytes.push(c))
  // console.log(bytes)
  expect(bytes).toEqual([120, 156, 75, 76, 4, 0, 1, 37, 0, 195])
})

test('deflate vs gzip length', async () => {
  const s = 'a'
  const zipped = await zip2.deflate(s)
  const gzipped = await zip2.gzip(s)
  // console.log(zipped)
  // console.log(gzipped)
  // console.log(zipped.length, gzipped.length)
  expect(zipped).toHaveLength(9)
  expect(gzipped).toHaveLength(21)

  const longString = 'a'.repeat(100_000)
  const zippedLong = await zip2.deflate(longString)
  const gzippedLong = await zip2.gzip(longString)
  // console.log(zippedLong)
  // console.log(gzippedLong)
  // console.log(zippedLong.length, gzippedLong.length)
  expect(zippedLong).toHaveLength(121)
  expect(gzippedLong).toHaveLength(133)
})
