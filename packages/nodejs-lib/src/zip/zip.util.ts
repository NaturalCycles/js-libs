import { promisify } from 'node:util'
import type { ZlibOptions, ZstdOptions } from 'node:zlib'
import zlib from 'node:zlib'
import type { Integer } from '@naturalcycles/js-lib/types'

const deflate = promisify(zlib.deflate.bind(zlib))
const inflate = promisify(zlib.inflate.bind(zlib))
const gzip = promisify(zlib.gzip.bind(zlib))
const gunzip = promisify(zlib.gunzip.bind(zlib))
const zstdCompressAsync = promisify(zlib.zstdCompress.bind(zlib))
const zstdDecompressAsync = promisify(zlib.zstdDecompress.bind(zlib))

export async function decompressZstdOrInflateToString(buf: Buffer): Promise<string> {
  return (await decompressZstdOrInflate(buf)).toString()
}

/**
 * Detects if Buffer is zstd-compressed.
 * Otherwise attempts to Inflate.
 */
export async function decompressZstdOrInflate(buf: Buffer): Promise<Buffer<ArrayBuffer>> {
  if (isZstdBuffer(buf)) {
    return await zstdDecompressAsync(buf)
  }
  return await inflate(buf)
}

/**
 * deflateBuffer uses `deflate`.
 * It's 9 bytes shorter than `gzip`.
 */
export async function deflateBuffer(
  buf: Buffer,
  options: ZlibOptions = {},
): Promise<Buffer<ArrayBuffer>> {
  return await deflate(buf, options)
}

export async function inflateBuffer(
  buf: Buffer,
  options: ZlibOptions = {},
): Promise<Buffer<ArrayBuffer>> {
  return await inflate(buf, options)
}

/**
 * deflateString uses `deflate`.
 * It's 9 bytes shorter than `gzip`.
 */
export async function deflateString(
  s: string,
  options?: ZlibOptions,
): Promise<Buffer<ArrayBuffer>> {
  return await deflate(s, options)
}

export async function inflateToString(buf: Buffer, options?: ZlibOptions): Promise<string> {
  return (await inflateBuffer(buf, options)).toString()
}

/**
 * gzipBuffer uses `gzip`
 * It's 9 bytes longer than `deflate`.
 */
export async function gzipBuffer(
  buf: Buffer,
  options: ZlibOptions = {},
): Promise<Buffer<ArrayBuffer>> {
  return await gzip(buf, options)
}

export async function gunzipBuffer(
  buf: Buffer,
  options: ZlibOptions = {},
): Promise<Buffer<ArrayBuffer>> {
  return await gunzip(buf, options)
}

/**
 * gzipString uses `gzip`.
 * It's 9 bytes longer than `deflate`.
 */
export async function gzipString(s: string, options?: ZlibOptions): Promise<Buffer<ArrayBuffer>> {
  return await gzip(s, options)
}

export async function gunzipToString(buf: Buffer, options?: ZlibOptions): Promise<string> {
  return (await gunzipBuffer(buf, options)).toString()
}

export async function zstdCompress(
  input: Buffer | string,
  level?: Integer, // defaults to 3
  options: ZstdOptions = {},
): Promise<Buffer<ArrayBuffer>> {
  return await zstdCompressAsync(input, zstdLevelToOptions(level, options))
}

export function zstdCompressSync(
  input: Buffer | string,
  level?: Integer, // defaults to 3
  options: ZstdOptions = {},
): Buffer<ArrayBuffer> {
  return zlib.zstdCompressSync(input, zstdLevelToOptions(level, options))
}

export function zstdLevelToOptions(level: Integer | undefined, opt: ZstdOptions = {}): ZstdOptions {
  if (!level) return opt

  return {
    ...opt,
    params: {
      ...opt.params,
      [zlib.constants.ZSTD_c_compressionLevel]: level,
    },
  }
}

export async function zstdDecompressToString(
  input: Buffer,
  options: ZstdOptions = {},
): Promise<string> {
  return (await zstdDecompressAsync(input, options)).toString()
}

export async function zstdDecompress(
  input: Buffer,
  options: ZstdOptions = {},
): Promise<Buffer<ArrayBuffer>> {
  return await zstdDecompressAsync(input, options)
}

export function zstdDecompressToStringSync(input: Buffer, options: ZstdOptions = {}): string {
  return zlib.zstdDecompressSync(input, options).toString()
}

export function zstdDecompressSync(input: Buffer, options: ZstdOptions = {}): Buffer<ArrayBuffer> {
  return zlib.zstdDecompressSync(input, options)
}

const ZSTD_MAGIC_NUMBER = 0xfd2fb528

export function isZstdBuffer(input: Buffer): boolean {
  return input.readUInt32LE(0) === ZSTD_MAGIC_NUMBER
}

export function isGzipBuffer(input: Buffer): boolean {
  return input[0] === 0x1f && input[1] === 0x8b
}
