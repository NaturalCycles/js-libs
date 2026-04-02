import { promisify } from 'node:util'
import type { ZlibOptions, ZstdOptions } from 'node:zlib'
import zlib from 'node:zlib'
import type { Integer } from '@naturalcycles/js-lib/types'

const deflateAsync = promisify(zlib.deflate.bind(zlib))
const inflateAsync = promisify(zlib.inflate.bind(zlib))
const gzipAsync = promisify(zlib.gzip.bind(zlib))
const gunzipAsync = promisify(zlib.gunzip.bind(zlib))
const zstdCompressAsync = promisify(zlib.zstdCompress.bind(zlib))
const zstdDecompressAsync = promisify(zlib.zstdDecompress.bind(zlib))

class Zip2 {
  async decompressZstdOrInflateToString(buf: Buffer): Promise<string> {
    return (await this.decompressZstdOrInflate(buf)).toString()
  }

  decompressZstdOrInflateToStringSync(buf: Buffer): string {
    return this.decompressZstdOrInflateSync(buf).toString()
  }

  /**
   * Detects if Buffer is zstd-compressed.
   * Otherwise attempts to Inflate.
   */
  async decompressZstdOrInflate(buf: Buffer): Promise<Buffer<ArrayBuffer>> {
    if (this.isZstdBuffer(buf)) {
      return await zstdDecompressAsync(buf)
    }
    return await inflateAsync(buf)
  }

  decompressZstdOrInflateSync(buf: Buffer): Buffer<ArrayBuffer> {
    if (this.isZstdBuffer(buf)) {
      return zlib.zstdDecompressSync(buf)
    }
    return zlib.inflateSync(buf)
  }

  /**
   * deflateBuffer uses `deflate`.
   * It's 9 bytes shorter than `gzip`.
   */
  async deflate(input: string | Buffer, options: ZlibOptions = {}): Promise<Buffer<ArrayBuffer>> {
    return await deflateAsync(input, options)
  }

  /**
   * deflateSync uses `deflate`.
   * It's 9 bytes shorter than `gzip`.
   */
  deflateSync(input: string | Buffer, options?: ZlibOptions): Buffer<ArrayBuffer> {
    return zlib.deflateSync(input, options)
  }

  async inflate(buf: Buffer, options: ZlibOptions = {}): Promise<Buffer<ArrayBuffer>> {
    return await inflateAsync(buf, options)
  }

  inflateSync(buf: Buffer, options: ZlibOptions = {}): Buffer<ArrayBuffer> {
    return zlib.inflateSync(buf, options)
  }

  async inflateToString(buf: Buffer, options?: ZlibOptions): Promise<string> {
    return (await this.inflate(buf, options)).toString()
  }

  inflateToStringSync(buf: Buffer, options?: ZlibOptions): string {
    return zlib.inflateSync(buf, options).toString()
  }

  /**
   * gzipBuffer uses `gzip`
   * It's 9 bytes longer than `deflate`.
   */
  async gzip(input: string | Buffer, options: ZlibOptions = {}): Promise<Buffer<ArrayBuffer>> {
    return await gzipAsync(input, options)
  }

  /**
   * gzipBuffer uses `gzip`
   * It's 9 bytes longer than `deflate`.
   */
  gzipSync(input: string | Buffer, options: ZlibOptions = {}): Buffer<ArrayBuffer> {
    return zlib.gzipSync(input, options)
  }

  async gunzip(buf: Buffer, options: ZlibOptions = {}): Promise<Buffer<ArrayBuffer>> {
    return await gunzipAsync(buf, options)
  }

  gunzipSync(buf: Buffer, options: ZlibOptions = {}): Buffer<ArrayBuffer> {
    return zlib.gunzipSync(buf, options)
  }

  async gunzipToString(buf: Buffer, options?: ZlibOptions): Promise<string> {
    return (await this.gunzip(buf, options)).toString()
  }

  gunzipToStringSync(buf: Buffer, options?: ZlibOptions): string {
    return zlib.gunzipSync(buf, options).toString()
  }

  async zstdCompress(
    input: Buffer | string,
    level?: Integer, // defaults to 3
    options: ZstdOptions = {},
  ): Promise<Buffer<ArrayBuffer>> {
    return await zstdCompressAsync(input, this.zstdLevelToOptions(level, options))
  }

  zstdCompressSync(
    input: Buffer | string,
    level?: Integer, // defaults to 3
    options: ZstdOptions = {},
  ): Buffer<ArrayBuffer> {
    return zlib.zstdCompressSync(input, this.zstdLevelToOptions(level, options))
  }

  zstdLevelToOptions(level: Integer | undefined, opt: ZstdOptions = {}): ZstdOptions {
    if (!level) return opt

    return {
      ...opt,
      params: {
        ...opt.params,
        [zlib.constants.ZSTD_c_compressionLevel]: level,
      },
    }
  }

  async zstdDecompressToString(input: Buffer, options: ZstdOptions = {}): Promise<string> {
    return (await zstdDecompressAsync(input, options)).toString()
  }

  /**
   * Warning! It leaks memory severely. Prefer sync.
   */
  async zstdDecompress(input: Buffer, options: ZstdOptions = {}): Promise<Buffer<ArrayBuffer>> {
    return await zstdDecompressAsync(input, options)
  }

  /**
   * Warning! It leaks memory severely. Prefer sync.
   */
  zstdDecompressToStringSync(input: Buffer, options: ZstdOptions = {}): string {
    return zlib.zstdDecompressSync(input, options).toString()
  }

  zstdDecompressSync(input: Buffer, options: ZstdOptions = {}): Buffer<ArrayBuffer> {
    return zlib.zstdDecompressSync(input, options)
  }

  isZstdBuffer(input: Buffer): boolean {
    return input.readUInt32LE(0) === ZSTD_MAGIC_NUMBER
  }

  isGzipBuffer(input: Buffer): boolean {
    return input[0] === 0x1f && input[1] === 0x8b
  }
}

export const zip2 = new Zip2()

const ZSTD_MAGIC_NUMBER = 0xfd2fb528
