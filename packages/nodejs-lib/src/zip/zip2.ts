import { createWriteStream } from 'node:fs'
import { promisify } from 'node:util'
import type { ZlibOptions, ZstdOptions } from 'node:zlib'
import zlib from 'node:zlib'
import type { Integer } from '@naturalcycles/js-lib/types'
import { openZip } from './zipReader.js'
import type { ZipEntry } from './zipReader.js'
import { createZipBuffer, zipPaths, ZipWriter } from './zipWriter.js'
import type { ZipFileEntry, ZipPathsOptions } from './zipWriter.js'

const deflateAsync = promisify(zlib.deflate.bind(zlib))
const inflateAsync = promisify(zlib.inflate.bind(zlib))
const gzipAsync = promisify(zlib.gzip.bind(zlib))
const gunzipAsync = promisify(zlib.gunzip.bind(zlib))
const zstdCompressAsync = promisify(zlib.zstdCompress.bind(zlib))
const zstdDecompressAsync = promisify(zlib.zstdDecompress.bind(zlib))

class Zip2 {
  async decompressZstdOrInflateToString(buf: Uint8Array): Promise<string> {
    return (await this.decompressZstdOrInflate(buf)).toString()
  }

  decompressZstdOrInflateToStringSync(buf: Uint8Array): string {
    return this.decompressZstdOrInflateSync(buf).toString()
  }

  /**
   * Detects if Buffer is zstd-compressed.
   * Otherwise attempts to Inflate.
   */
  async decompressZstdOrInflate(buf: Uint8Array): Promise<Buffer<ArrayBuffer>> {
    if (this.isZstdBuffer(buf)) {
      return await zstdDecompressAsync(buf)
    }
    return await inflateAsync(buf)
  }

  decompressZstdOrInflateSync(buf: Uint8Array): Buffer<ArrayBuffer> {
    if (this.isZstdBuffer(buf)) {
      return zlib.zstdDecompressSync(buf)
    }
    return zlib.inflateSync(buf)
  }

  /**
   * deflateBuffer uses `deflate`.
   * It's 9 bytes shorter than `gzip`.
   */
  async deflate(
    input: string | Uint8Array,
    options: ZlibOptions = {},
  ): Promise<Buffer<ArrayBuffer>> {
    return await deflateAsync(input, options)
  }

  /**
   * deflateSync uses `deflate`.
   * It's 9 bytes shorter than `gzip`.
   */
  deflateSync(input: string | Uint8Array, options?: ZlibOptions): Buffer<ArrayBuffer> {
    return zlib.deflateSync(input, options)
  }

  async inflate(buf: Uint8Array, options: ZlibOptions = {}): Promise<Buffer<ArrayBuffer>> {
    return await inflateAsync(buf, options)
  }

  inflateSync(buf: Uint8Array, options: ZlibOptions = {}): Buffer<ArrayBuffer> {
    return zlib.inflateSync(buf, options)
  }

  async inflateToString(buf: Uint8Array, options?: ZlibOptions): Promise<string> {
    return (await this.inflate(buf, options)).toString()
  }

  inflateToStringSync(buf: Uint8Array, options?: ZlibOptions): string {
    return zlib.inflateSync(buf, options).toString()
  }

  /**
   * gzipBuffer uses `gzip`
   * It's 9 bytes longer than `deflate`.
   */
  async gzip(input: string | Uint8Array, options: ZlibOptions = {}): Promise<Buffer<ArrayBuffer>> {
    return await gzipAsync(input, options)
  }

  /**
   * gzipBuffer uses `gzip`
   * It's 9 bytes longer than `deflate`.
   */
  gzipSync(input: string | Uint8Array, options: ZlibOptions = {}): Buffer<ArrayBuffer> {
    return zlib.gzipSync(input, options)
  }

  async gunzip(buf: Uint8Array, options: ZlibOptions = {}): Promise<Buffer<ArrayBuffer>> {
    return await gunzipAsync(buf, options)
  }

  gunzipSync(buf: Uint8Array, options: ZlibOptions = {}): Buffer<ArrayBuffer> {
    return zlib.gunzipSync(buf, options)
  }

  async gunzipToString(buf: Uint8Array, options?: ZlibOptions): Promise<string> {
    return (await this.gunzip(buf, options)).toString()
  }

  gunzipToStringSync(buf: Uint8Array, options?: ZlibOptions): string {
    return zlib.gunzipSync(buf, options).toString()
  }

  async zstdCompress(
    input: Uint8Array | string,
    level?: Integer, // defaults to 3
    options: ZstdOptions = {},
  ): Promise<Buffer<ArrayBuffer>> {
    return await zstdCompressAsync(input, this.zstdLevelToOptions(level, options))
  }

  zstdCompressSync(
    input: Uint8Array | string,
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

  async zstdDecompressToString(input: Uint8Array, options: ZstdOptions = {}): Promise<string> {
    return (await zstdDecompressAsync(input, options)).toString()
  }

  /**
   * Warning! It leaks memory severely. Prefer sync.
   */
  async zstdDecompress(input: Uint8Array, options: ZstdOptions = {}): Promise<Buffer<ArrayBuffer>> {
    return await zstdDecompressAsync(input, options)
  }

  /**
   * Warning! It leaks memory severely. Prefer sync.
   */
  zstdDecompressToStringSync(input: Uint8Array, options: ZstdOptions = {}): string {
    return zlib.zstdDecompressSync(input, options).toString()
  }

  zstdDecompressSync(input: Uint8Array, options: ZstdOptions = {}): Buffer<ArrayBuffer> {
    return zlib.zstdDecompressSync(input, options)
  }

  isZstdBuffer(input: Uint8Array): boolean {
    // zstd magic number 0xFD2FB528, stored little-endian
    return input[0] === 0x28 && input[1] === 0xb5 && input[2] === 0x2f && input[3] === 0xfd
  }

  isGzipBuffer(input: Uint8Array): boolean {
    return input[0] === 0x1f && input[1] === 0x8b
  }

  /**
   * Open a zip file and extract all of its entries into `destDir`, streaming each
   * file to disk. Directories are created as needed.
   *
   * Path-traversal attempts (absolute paths, `..` segments, or paths escaping
   * `destDir`) are rejected.
   *
   * Returns the list of extracted entries.
   */
  async extractZipFileToDirectory(
    zipFilePath: string,
    destDir: string,
  ): Promise<readonly ZipEntry[]> {
    const zip = await openZip(zipFilePath)
    try {
      return await zip.extractAll(destDir)
    } finally {
      await zip.close()
    }
  }

  /**
   * Create a zip archive on disk from a list of files and/or directories.
   */
  async zipPaths(
    paths: readonly string[],
    outputZipFilePath: string,
    opt?: ZipPathsOptions,
  ): Promise<void> {
    return await zipPaths(paths, outputZipFilePath, opt)
  }

  /**
   * Create a zip archive on disk, returning a {@link ZipWriter} that streams to it.
   *
   * Add entries with {@link ZipWriter.addFile}/{@link ZipWriter.addBuffer}/etc.,
   * then call {@link ZipWriter.finalize} (or use `await using`):
   *
   * ```ts
   * const zip = createZip('archive.zip')
   * await zip.addFile('./photo.jpg')
   * await zip.addBuffer(Buffer.from('{"a":1}'), 'data.json')
   * await zip.finalize()
   * ```
   */
  createZip(filePath: string): ZipWriter {
    return new ZipWriter(createWriteStream(filePath))
  }

  /**
   * Build a zip archive entirely in memory and return it as a Buffer.
   *
   * For large archives or streamed inputs prefer {@link createZip} / {@link ZipWriter}.
   */
  async createZipBuffer(entries: readonly ZipFileEntry[]): Promise<Buffer<ArrayBuffer>> {
    return await createZipBuffer(entries)
  }
}

export const zip2 = new Zip2()
