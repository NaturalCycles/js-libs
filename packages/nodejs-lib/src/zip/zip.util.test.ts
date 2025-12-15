import { expect, test } from 'vitest'
import {
  decompressZstdOrInflateToString,
  deflateBuffer,
  deflateString,
  gunzipBuffer,
  gunzipToString,
  gzipBuffer,
  gzipString,
  inflateBuffer,
  inflateToString,
  isGzipBuffer,
  isZstdBuffer,
  zstdCompress,
  zstdDecompress,
  zstdDecompressToString,
} from './zip.util.js'

test('deflate/inflate', async () => {
  const s = 'abcd1234$%^'

  // String
  let zippedBuf = await deflateString(s)
  const unzippedStr = await inflateToString(zippedBuf)
  expect(unzippedStr).toBe(s)

  const sBuf = Buffer.from(s)
  zippedBuf = await deflateBuffer(sBuf)
  const unzippedBuf = await inflateBuffer(zippedBuf)
  expect(unzippedBuf).toEqual(sBuf)
})

test('zstd compress/decompress', async () => {
  const s = 'abcd1234$%^'

  let compressedBuf = await zstdCompress(s)
  const decompressedStr = await zstdDecompressToString(compressedBuf)
  expect(decompressedStr).toBe(s)

  const sBuf = Buffer.from(s)
  compressedBuf = await zstdCompress(sBuf)
  const decompressedBuf = await zstdDecompress(compressedBuf)
  expect(decompressedBuf).toEqual(sBuf)
})

test('gzip/gunzip', async () => {
  const s = 'abcd1234$%^'

  // String
  let zippedBuf = await gzipString(s)
  const unzippedStr = await gunzipToString(zippedBuf)
  expect(unzippedStr).toBe(s)

  const sBuf = Buffer.from(s)
  zippedBuf = await gzipBuffer(sBuf)
  const unzippedBuf = await gunzipBuffer(zippedBuf)
  expect(unzippedBuf).toEqual(sBuf)
})

test('compression detection', async () => {
  const s = 'abcd1234$%^'
  const deflated = await deflateString(s)
  const gzipped = await gzipString(s)
  const zsted = await zstdCompress(s)

  expect(isZstdBuffer(deflated)).toBe(false)
  expect(isZstdBuffer(gzipped)).toBe(false)
  expect(isZstdBuffer(zsted)).toBe(true)

  expect(isGzipBuffer(deflated)).toBe(false)
  expect(isGzipBuffer(gzipped)).toBe(true)
  expect(isGzipBuffer(zsted)).toBe(false)

  expect(await decompressZstdOrInflateToString(deflated)).toBe(s)
  // expect(await decompressZstdOrInflateToString(gzipped)).toBe(s) // gzip is not supported
  expect(await decompressZstdOrInflateToString(zsted)).toBe(s)
})

test('compatible with java impl', async () => {
  const s = 'aa'
  const zippedBuf = await deflateString(s)
  const bytes: number[] = []
  zippedBuf.forEach(c => bytes.push(c))
  // console.log(bytes)
  expect(bytes).toEqual([120, 156, 75, 76, 4, 0, 1, 37, 0, 195])
})

test('deflate vs gzip length', async () => {
  const s = 'a'
  const zipped = await deflateString(s)
  const gzipped = await gzipString(s)
  // console.log(zipped)
  // console.log(gzipped)
  // console.log(zipped.length, gzipped.length)
  expect(zipped).toHaveLength(9)
  expect(gzipped).toHaveLength(21)

  const longString = 'a'.repeat(100_000)
  const zippedLong = await deflateString(longString)
  const gzippedLong = await gzipString(longString)
  // console.log(zippedLong)
  // console.log(gzippedLong)
  // console.log(zippedLong.length, gzippedLong.length)
  expect(zippedLong).toHaveLength(121)
  expect(gzippedLong).toHaveLength(133)
})
