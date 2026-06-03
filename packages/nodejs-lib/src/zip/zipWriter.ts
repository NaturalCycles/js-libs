/*

A minimal, dependency-free zip archive writer for Node.js 24+.

Adapted from yazl (https://github.com/thejoshwolfe/yazl) by Josh Wolfe (MIT License),
rewritten in a modern, Promise-based, async/await style:

- No external dependencies. `buffer-crc32` is replaced by the built-in `zlib.crc32`
  (used incrementally while streaming), and the deflate is done with `node:zlib`.
- Promise API instead of callbacks/EventEmitter: `await writer.addFile(...)` etc.,
  finished with `await writer.finalize()`.
- Streaming entries (`addStream`/`addFile`) are written with a data descriptor
  (general purpose bit 3), so their size and CRC need not be known up front.
- Buffer entries (`addBuffer`) are written with their sizes and CRC inline.

Kept from yazl: ZIP64 output (auto-enabled past the 4 GiB / 0xffff limits, or via
`forceZip64`), the Info-ZIP extended timestamp (0x5455) for accurate mtimes, DOS
date/time encoding, file-name validation and per-entry/archive comments.

Shares the low-level format details (signatures, sizes, 64-bit and DOS date/time
helpers, name validation) with the reader via `zipInternal.ts`.

 */

import { createReadStream, createWriteStream } from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import type { Readable } from 'node:stream'
import { Transform, Writable } from 'node:stream'
import { finished, pipeline } from 'node:stream/promises'
import { promisify } from 'node:util'
import zlib from 'node:zlib'
import { comparators } from '@naturalcycles/js-lib/array/sort.js'
import type { UnixTimestamp } from '@naturalcycles/js-lib/types'
import { glob } from 'tinyglobby'
import {
  assertSafeZipEntryName,
  CDFH_SIG,
  CDFH_SIZE,
  DATA_DESCRIPTOR_SIG,
  DEFLATE,
  EOCDR_SIG,
  EOCDR_SIZE,
  LOCAL_FILE_HEADER_SIG,
  MAX_COMMENT_SIZE,
  normalizeZipEntryName,
  STORED,
  unixToDosDateTime,
  writeUInt64LE,
  ZIP64_EOCDL_SIG,
  ZIP64_EOCDL_SIZE,
  ZIP64_EOCDR_SIG,
  ZIP64_EOCDR_SIZE,
} from './zipInternal.js'

// oxlint-disable no-bitwise, unicorn/prefer-math-trunc -- writing the binary ZIP format requires bitwise ops on bit flags, packed DOS date/time fields, and unsigned 32-bit attribute packing

const deflateRawAsync = promisify(zlib.deflateRaw.bind(zlib))

/**
 * Create a zip archive on disk from a list of files and/or directories.
 *
 * Each input path may be a file (added directly) or a directory (walked
 * recursively; all nested files are added). By default an entry's name is its
 * path relative to its input's parent directory, so `zipFiles(['./photos'], 'out.zip')`
 * stores entries under `photos/...`. Override the base via {@link ZipPathsOptions.baseDir}.
 *
 * Files discovered by walking a directory are added in deterministic (sorted)
 * order; the explicit input order is otherwise preserved.
 *
 * ```ts
 * await zipPaths(['./photos'], 'photos.zip') // a whole directory
 * await zipPaths(['a.txt', 'log/b.txt'], 'out.zip') // a list of files
 * ```
 *
 * On failure the partially-written archive is removed.
 */
export async function zipPaths(
  paths: string[],
  outputZipFilePath: string,
  opt: ZipPathsOptions = {},
): Promise<void> {
  const { baseDir, ...entryOpt } = opt
  const inputs = paths.map(p => path.resolve(p))
  const files = await collectFiles(inputs, baseDir)

  // Build the write stream here (rather than via createZip) so a mid-way failure
  // can tear down the stream and remove the half-written archive.
  const out = createWriteStream(outputZipFilePath)
  const writer = new ZipWriter(out)
  try {
    for (const file of files) {
      await writer.addFile(file.absPath, file.name, entryOpt)
    }
    await writer.finalize()
  } catch (err) {
    out.destroy()
    await fsp.rm(outputZipFilePath, { force: true })
    throw err
  }
}

/**
 * Build a zip archive entirely in memory and return it as a Buffer.
 *
 * For large archives or streamed inputs prefer {@link createZip} / {@link ZipWriter}.
 */
export async function createZipBuffer(entries: ZipFileEntry[]): Promise<Buffer> {
  const chunks: Buffer[] = []
  const sink = new Writable({
    write(chunk: Buffer, _enc, cb) {
      chunks.push(chunk)
      cb()
    },
  })
  const writer = new ZipWriter(sink)
  for (const { name, content, ...opt } of entries) {
    if (content === undefined) {
      await writer.addDirectory(name, opt)
    } else {
      await writer.addBuffer(content, name, opt)
    }
  }
  await writer.finalize()
  return Buffer.concat(chunks)
}

/**
 * Options for {@link zipPaths}.
 */
export interface ZipPathsOptions extends ZipWriterEntryOptions {
  /**
   * Base directory used to compute entry names: each file is stored under its path
   * relative to `baseDir`.
   *
   * Defaults to the parent of each input path, so a file `/a/b.txt` is stored as
   * `b.txt` and a directory `/a/photos` is stored under `photos/...` (its own name
   * is preserved). Pass the directory itself as `baseDir` to instead place its
   * contents at the archive root.
   */
  baseDir?: string
}

/**
 * Writes a zip archive to a Node.js {@link Writable} stream.
 *
 * Create one directly over any `Writable`, or use {@link createZip} to write to
 * a file. Add entries sequentially (each add method must be awaited before the
 * next), then call {@link finalize} to write the central directory and close the
 * stream.
 *
 * Implements `AsyncDisposable`, so `await using` finalizes automatically on scope
 * exit:
 *
 * ```ts
 * await using zip = createZip('archive.zip')
 * await zip.addBuffer(Buffer.from('hello'), 'hello.txt')
 * // zip.finalize() is called automatically here
 * ```
 */
export class ZipWriter implements AsyncDisposable {
  private offset = 0
  private finalized = false
  private streamError?: Error
  private readonly entries: WriteEntry[] = []

  constructor(private out: Writable) {
    // Capture stream errors so a pending/next write rejects instead of the
    // 'error' event going unhandled and crashing the process.
    this.out.once('error', err => {
      this.streamError ??= err
    })
  }

  /**
   * Add an in-memory buffer as a file entry.
   * The CRC-32 and sizes are computed up front and written inline (no data descriptor).
   */
  async addBuffer(data: Buffer, fileName: string, opt: ZipWriterEntryOptions = {}): Promise<void> {
    this.assertWritable()
    const entry = this.createEntry(fileName, false, opt)
    entry.crc32 = zlib.crc32(data)
    entry.uncompressedSize = data.length
    const stored =
      entry.method === STORED ? data : await deflateRawAsync(data, { level: entry.level })
    entry.compressedSize = stored.length
    entry.crcAndFileSizeKnown = true
    await this.writeKnownEntry(entry, stored)
  }

  /**
   * Add a file from disk, streaming its contents. The entry's mtime and mode
   * default to the file's own (override via `opt`). If `fileName` is omitted,
   * the file's base name is used.
   */
  async addFile(
    filePath: string,
    fileName?: string,
    opt: ZipWriterEntryOptions = {},
  ): Promise<void> {
    this.assertWritable()
    const stats = await fsp.stat(filePath)
    const entry = this.createEntry(fileName ?? path.basename(filePath), false, {
      mtime: Math.floor(stats.mtimeMs / 1000) as UnixTimestamp,
      mode: stats.mode & 0xffff,
      ...opt,
    })
    await this.pumpEntry(entry, createReadStream(filePath))
  }

  /**
   * Add a readable stream as a file entry. The size and CRC are computed while
   * streaming and written in a trailing data descriptor.
   */
  async addStream(
    stream: Readable,
    fileName: string,
    opt: ZipWriterEntryOptions = {},
  ): Promise<void> {
    this.assertWritable()
    const entry = this.createEntry(fileName, false, opt)
    await this.pumpEntry(entry, stream)
  }

  /**
   * Add an explicit (empty) directory entry. A trailing `/` is added if missing.
   * Directory entries are optional in zip archives but make empty directories explicit.
   */
  async addDirectory(fileName: string, opt: ZipWriterEntryOptions = {}): Promise<void> {
    this.assertWritable()
    const entry = this.createEntry(fileName, true, opt)
    await this.writeKnownEntry(entry, EMPTY)
  }

  /**
   * Write the central directory and end-of-central-directory records, then end
   * the underlying stream and wait for it to flush. Idempotent.
   */
  async finalize(opt: ZipFinalizeOptions = {}): Promise<void> {
    if (this.finalized) return
    const comment = opt.comment ? Buffer.from(opt.comment, 'utf8') : EMPTY
    if (comment.length > MAX_COMMENT_SIZE) {
      throw new Error(`archive comment is too long: ${comment.length} > ${MAX_COMMENT_SIZE} bytes`)
    }
    // A comment containing this signature would confuse readers that scan
    // backwards for the end-of-central-directory record.
    if (comment.includes(EOCDR_SIG_BYTES)) {
      throw new Error('archive comment must not contain the end-of-central-directory signature')
    }
    this.finalized = true

    const centralDirectoryOffset = this.offset
    for (const entry of this.entries) {
      await this.write(buildCentralDirectoryRecord(entry))
    }
    const centralDirectorySize = this.offset - centralDirectoryOffset
    await this.write(
      buildEndRecords({
        entryCount: this.entries.length,
        centralDirectoryOffset,
        centralDirectorySize,
        comment,
        zip64EocdrOffset: this.offset,
        forceZip64: opt.forceZip64 ?? false,
      }),
    )
    await this.finishStream()
  }

  /**
   * Called by `await using`; finalizes the archive if not already done. See {@link finalize}.
   */
  async [Symbol.asyncDispose](): Promise<void> {
    await this.finalize()
  }

  private assertWritable(): void {
    if (this.streamError) throw this.streamError
    if (this.finalized) throw new Error('ZipWriter has already been finalized')
  }

  /** Build the in-memory representation of an entry from its name and options. */
  private createEntry(
    fileName: string,
    isDirectory: boolean,
    opt: ZipWriterEntryOptions,
  ): WriteEntry {
    const nameBuf = Buffer.from(normalizeAndValidateEntryName(fileName, isDirectory), 'utf8')
    if (nameBuf.length > MAX_COMMENT_SIZE) {
      throw new Error(`zip entry name is too long: ${nameBuf.length} > ${MAX_COMMENT_SIZE} bytes`)
    }
    const mtime = opt.mtime ?? (Math.floor(Date.now() / 1000) as UnixTimestamp)
    const { date, time } = unixToDosDateTime(mtime)
    const mode = opt.mode ?? (isDirectory ? DEFAULT_DIR_MODE : DEFAULT_FILE_MODE)
    if ((mode & 0xffff) !== mode) {
      throw new Error(`invalid mode: expected 0 <= ${mode} <= 65535`)
    }
    const compress = isDirectory ? false : (opt.compress ?? true)
    const level = compress ? (opt.level ?? DEFAULT_DEFLATE_LEVEL) : 0
    const commentBuf = opt.comment ? Buffer.from(opt.comment, 'utf8') : EMPTY
    if (commentBuf.length > MAX_COMMENT_SIZE) {
      throw new Error(
        `zip entry comment is too long: ${commentBuf.length} > ${MAX_COMMENT_SIZE} bytes`,
      )
    }
    return {
      nameBuf,
      isDirectory,
      method: level === 0 ? STORED : DEFLATE,
      level,
      // Directories carry no data, so their (zero) sizes and CRC are known up front.
      crcAndFileSizeKnown: isDirectory,
      crc32: 0,
      uncompressedSize: 0,
      compressedSize: 0,
      relativeOffsetOfLocalHeader: 0,
      lastModFileTime: time,
      lastModFileDate: date,
      mtimeSeconds: clampInt32(mtime),
      // Unix mode packed into the high 16 bits; `>>> 0` keeps it an unsigned uint32.
      externalFileAttributes: (mode << 16) >>> 0,
      commentBuf,
      forceZip64: opt.forceZip64 ?? false,
    }
  }

  /** Write an entry whose CRC and sizes are already known: header, name, data, no descriptor. */
  private async writeKnownEntry(entry: WriteEntry, data: Buffer): Promise<void> {
    entry.relativeOffsetOfLocalHeader = this.offset
    await this.write(buildLocalFileHeader(entry))
    await this.write(entry.nameBuf)
    await this.write(data)
    this.entries.push(entry)
  }

  /** Write a streamed entry: header with bit 3 set, streamed data, then a data descriptor. */
  private async pumpEntry(entry: WriteEntry, source: Readable): Promise<void> {
    entry.relativeOffsetOfLocalHeader = this.offset
    await this.write(buildLocalFileHeader(entry))
    await this.write(entry.nameBuf)
    const { crc32, uncompressedSize, compressedSize } = await this.pumpData(
      source,
      entry.method === DEFLATE,
      entry.level,
    )
    entry.crc32 = crc32
    entry.uncompressedSize = uncompressedSize
    entry.compressedSize = compressedSize
    await this.write(buildDataDescriptor(entry, useZip64(entry)))
    this.entries.push(entry)
  }

  /**
   * Pipe `source` to the output, computing the CRC-32 and uncompressed size on
   * the way in, optionally deflating, and counting the compressed bytes written.
   */
  private async pumpData(
    source: Readable,
    compress: boolean,
    level: number,
  ): Promise<{ crc32: number; uncompressedSize: number; compressedSize: number }> {
    let crc32 = 0
    let uncompressedSize = 0
    let compressedSize = 0

    // Tap the uncompressed bytes for the CRC-32 and size before they are deflated.
    const tap = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        crc32 = zlib.crc32(chunk, crc32)
        uncompressedSize += chunk.length
        cb(null, chunk)
      },
    })
    // Final pipeline stage: write each (possibly compressed) chunk to the output,
    // counting bytes. Awaiting `write` propagates backpressure up the pipeline.
    const drain = async (src: AsyncIterable<Buffer>): Promise<void> => {
      for await (const chunk of src) {
        compressedSize += chunk.length
        await this.write(chunk)
      }
    }

    if (compress) {
      await pipeline(source, tap, zlib.createDeflateRaw({ level }), drain)
    } else {
      await pipeline(source, tap, drain)
    }
    return { crc32, uncompressedSize, compressedSize }
  }

  /** Write a buffer to the output, tracking the byte offset and respecting backpressure. */
  private async write(buf: Buffer): Promise<void> {
    if (this.streamError) throw this.streamError
    if (buf.length === 0) return
    this.offset += buf.length
    if (!this.out.write(buf)) {
      await this.waitDrain()
    }
  }

  private async waitDrain(): Promise<void> {
    return new Promise((resolve, reject) => {
      const cleanup = (): void => {
        this.out.off('drain', onDrain)
        this.out.off('error', onError)
      }
      const onDrain = (): void => {
        cleanup()
        resolve()
      }
      const onError = (err: Error): void => {
        cleanup()
        reject(err)
      }
      this.out.once('drain', onDrain)
      this.out.once('error', onError)
    })
  }

  private async finishStream(): Promise<void> {
    this.out.end()
    await finished(this.out)
  }
}

/**
 * Internal, fully-resolved representation of an entry, accumulated until
 * {@link ZipWriter.finalize} writes the central directory.
 */
interface WriteEntry {
  nameBuf: Buffer
  isDirectory: boolean
  /** Compression method: {@link STORED} or {@link DEFLATE}. */
  method: number
  /** Deflate level (0 = stored). */
  level: number
  /** True for buffer/directory entries (no data descriptor); false for streamed entries. */
  crcAndFileSizeKnown: boolean
  crc32: number
  uncompressedSize: number
  compressedSize: number
  relativeOffsetOfLocalHeader: number
  lastModFileTime: number
  lastModFileDate: number
  /** mtime as a Unix timestamp (seconds), for the Info-ZIP extended timestamp field. */
  mtimeSeconds: number
  /** Unix mode shifted into the high 16 bits, as stored in the central directory. */
  externalFileAttributes: number
  commentBuf: Buffer
  forceZip64: boolean
}

function buildLocalFileHeader(entry: WriteEntry): Buffer {
  const buf = Buffer.allocUnsafe(LOCAL_FILE_HEADER_SIZE)
  let generalPurposeBitFlag = FILE_NAME_IS_UTF8
  let crc32 = 0
  let compressedSize = 0
  let uncompressedSize = 0
  if (entry.crcAndFileSizeKnown) {
    crc32 = entry.crc32
    compressedSize = entry.compressedSize
    uncompressedSize = entry.uncompressedSize
  } else {
    // Sizes/CRC are unknown until the data has streamed; bit 3 says a data
    // descriptor follows the file data.
    generalPurposeBitFlag |= UNKNOWN_CRC32_AND_FILE_SIZES
  }
  buf.writeUInt32LE(LOCAL_FILE_HEADER_SIG, 0)
  buf.writeUInt16LE(VERSION_NEEDED_UTF8, 4)
  buf.writeUInt16LE(generalPurposeBitFlag, 6)
  buf.writeUInt16LE(entry.method, 8)
  buf.writeUInt16LE(entry.lastModFileTime, 10)
  buf.writeUInt16LE(entry.lastModFileDate, 12)
  buf.writeUInt32LE(crc32, 14)
  buf.writeUInt32LE(compressedSize, 18)
  buf.writeUInt32LE(uncompressedSize, 22)
  buf.writeUInt16LE(entry.nameBuf.length, 26)
  buf.writeUInt16LE(0, 28) // no extra field in the local header
  return buf
}

function buildDataDescriptor(entry: WriteEntry, asZip64: boolean): Buffer {
  if (!asZip64) {
    const buf = Buffer.allocUnsafe(DATA_DESCRIPTOR_SIZE)
    buf.writeUInt32LE(DATA_DESCRIPTOR_SIG, 0)
    buf.writeUInt32LE(entry.crc32, 4)
    buf.writeUInt32LE(entry.compressedSize, 8)
    buf.writeUInt32LE(entry.uncompressedSize, 12)
    return buf
  }
  const buf = Buffer.allocUnsafe(ZIP64_DATA_DESCRIPTOR_SIZE)
  buf.writeUInt32LE(DATA_DESCRIPTOR_SIG, 0)
  buf.writeUInt32LE(entry.crc32, 4)
  writeUInt64LE(buf, entry.compressedSize, 8)
  writeUInt64LE(buf, entry.uncompressedSize, 16)
  return buf
}

function buildCentralDirectoryRecord(entry: WriteEntry): Buffer {
  let generalPurposeBitFlag = FILE_NAME_IS_UTF8
  if (!entry.crcAndFileSizeKnown) generalPurposeBitFlag |= UNKNOWN_CRC32_AND_FILE_SIZES

  const timestampField = buildExtendedTimestampField(entry.mtimeSeconds)

  // When ZIP64 is needed, the 32-bit fields hold the 0xffffffff sentinel and the
  // real values live in the ZIP64 extended information extra field.
  let compressedSize = entry.compressedSize
  let uncompressedSize = entry.uncompressedSize
  let localHeaderOffset = entry.relativeOffsetOfLocalHeader
  let versionNeeded = VERSION_NEEDED_UTF8
  let zip64Field = EMPTY
  if (useZip64(entry)) {
    compressedSize = 0xffffffff
    uncompressedSize = 0xffffffff
    localHeaderOffset = 0xffffffff
    versionNeeded = VERSION_NEEDED_ZIP64
    zip64Field = buildZip64ExtraField(entry)
  }

  const buf = Buffer.allocUnsafe(CDFH_SIZE)
  buf.writeUInt32LE(CDFH_SIG, 0)
  buf.writeUInt16LE(VERSION_MADE_BY, 4)
  buf.writeUInt16LE(versionNeeded, 6)
  buf.writeUInt16LE(generalPurposeBitFlag, 8)
  buf.writeUInt16LE(entry.method, 10)
  buf.writeUInt16LE(entry.lastModFileTime, 12)
  buf.writeUInt16LE(entry.lastModFileDate, 14)
  buf.writeUInt32LE(entry.crc32, 16)
  buf.writeUInt32LE(compressedSize, 20)
  buf.writeUInt32LE(uncompressedSize, 24)
  buf.writeUInt16LE(entry.nameBuf.length, 28)
  buf.writeUInt16LE(timestampField.length + zip64Field.length, 30)
  buf.writeUInt16LE(entry.commentBuf.length, 32)
  buf.writeUInt16LE(0, 34) // disk number start
  buf.writeUInt16LE(0, 36) // internal file attributes
  buf.writeUInt32LE(entry.externalFileAttributes, 38)
  buf.writeUInt32LE(localHeaderOffset, 42)
  return Buffer.concat([buf, entry.nameBuf, timestampField, zip64Field, entry.commentBuf])
}

/**
 * Info-ZIP universal (extended) timestamp extra field (0x5455), central-directory
 * variant: a single 32-bit UTC mtime. Gives 1-second, timezone-independent mtimes,
 * which readers prefer over the coarse local-time DOS fields.
 */
function buildExtendedTimestampField(mtimeSeconds: number): Buffer {
  const buf = Buffer.allocUnsafe(INFO_ZIP_TIMESTAMP_FIELD_SIZE)
  buf.writeUInt16LE(0x5455, 0)
  buf.writeUInt16LE(INFO_ZIP_TIMESTAMP_FIELD_SIZE - 4, 2)
  // Set both the mtime and atime flags to match Info-ZIP, even though only the
  // mtime field follows (the central-directory variant never carries atime).
  buf.writeUInt8(EB_UT_FL_MTIME | EB_UT_FL_ATIME, 4)
  buf.writeInt32LE(mtimeSeconds, 5)
  return buf
}

/** ZIP64 extended information extra field (0x0001) for a central directory record. */
function buildZip64ExtraField(entry: WriteEntry): Buffer {
  const buf = Buffer.allocUnsafe(ZIP64_EIEF_SIZE)
  buf.writeUInt16LE(0x0001, 0)
  buf.writeUInt16LE(ZIP64_EIEF_SIZE - 4, 2)
  // Order must match the 0xffffffff sentinels above: uncompressed, compressed, offset.
  writeUInt64LE(buf, entry.uncompressedSize, 4)
  writeUInt64LE(buf, entry.compressedSize, 12)
  writeUInt64LE(buf, entry.relativeOffsetOfLocalHeader, 20)
  return buf
}

function useZip64(entry: WriteEntry): boolean {
  return (
    entry.forceZip64 ||
    entry.uncompressedSize > 0xfffffffe ||
    entry.compressedSize > 0xfffffffe ||
    entry.relativeOffsetOfLocalHeader > 0xfffffffe
  )
}

/**
 * Build the end-of-central-directory record, prefixed with the ZIP64 EOCD record
 * and locator when the archive needs ZIP64 (too many entries, or a central
 * directory that starts or extends past 4 GiB).
 */
interface EndRecordsInput {
  entryCount: number
  centralDirectoryOffset: number
  centralDirectorySize: number
  comment: Buffer
  /** Absolute offset where the ZIP64 EOCD record will be written (if needed). */
  zip64EocdrOffset: number
  forceZip64: boolean
}

function buildEndRecords(input: EndRecordsInput): Buffer {
  const {
    entryCount,
    centralDirectoryOffset,
    centralDirectorySize,
    comment,
    zip64EocdrOffset,
    forceZip64,
  } = input

  let needZip64 = forceZip64
  let normalEntryCount = entryCount
  if (forceZip64 || entryCount >= 0xffff) {
    normalEntryCount = 0xffff
    needZip64 = true
  }
  let normalCentralDirectorySize = centralDirectorySize
  if (forceZip64 || centralDirectorySize >= 0xffffffff) {
    normalCentralDirectorySize = 0xffffffff
    needZip64 = true
  }
  let normalCentralDirectoryOffset = centralDirectoryOffset
  if (forceZip64 || centralDirectoryOffset >= 0xffffffff) {
    normalCentralDirectoryOffset = 0xffffffff
    needZip64 = true
  }

  const eocdr = Buffer.allocUnsafe(EOCDR_SIZE + comment.length)
  eocdr.writeUInt32LE(EOCDR_SIG, 0)
  eocdr.writeUInt16LE(0, 4) // number of this disk
  eocdr.writeUInt16LE(0, 6) // disk with the start of the central directory
  eocdr.writeUInt16LE(normalEntryCount, 8) // entries on this disk
  eocdr.writeUInt16LE(normalEntryCount, 10) // total entries
  eocdr.writeUInt32LE(normalCentralDirectorySize, 12)
  eocdr.writeUInt32LE(normalCentralDirectoryOffset, 16)
  eocdr.writeUInt16LE(comment.length, 20)
  comment.copy(eocdr, 22)

  if (!needZip64) return eocdr

  const zip64Eocdr = Buffer.allocUnsafe(ZIP64_EOCDR_SIZE)
  zip64Eocdr.writeUInt32LE(ZIP64_EOCDR_SIG, 0)
  // size of this record, excluding the first 12 bytes (signature + this field)
  writeUInt64LE(zip64Eocdr, ZIP64_EOCDR_SIZE - 12, 4)
  zip64Eocdr.writeUInt16LE(VERSION_MADE_BY, 12)
  zip64Eocdr.writeUInt16LE(VERSION_NEEDED_ZIP64, 14)
  zip64Eocdr.writeUInt32LE(0, 16) // number of this disk
  zip64Eocdr.writeUInt32LE(0, 20) // disk with the start of the central directory
  writeUInt64LE(zip64Eocdr, entryCount, 24) // entries on this disk
  writeUInt64LE(zip64Eocdr, entryCount, 32) // total entries
  writeUInt64LE(zip64Eocdr, centralDirectorySize, 40)
  writeUInt64LE(zip64Eocdr, centralDirectoryOffset, 48)

  const locator = Buffer.allocUnsafe(ZIP64_EOCDL_SIZE)
  locator.writeUInt32LE(ZIP64_EOCDL_SIG, 0)
  locator.writeUInt32LE(0, 4) // disk with the ZIP64 end-of-central-directory record
  writeUInt64LE(locator, zip64EocdrOffset, 8)
  locator.writeUInt32LE(1, 16) // total number of disks

  return Buffer.concat([zip64Eocdr, locator, eocdr])
}

function normalizeAndValidateEntryName(fileName: string, isDirectory: boolean): string {
  if (!fileName) throw new Error('zip entry name must not be empty')
  let name = normalizeZipEntryName(fileName)
  if (isDirectory) {
    if (!name.endsWith('/')) name += '/'
  } else if (name.endsWith('/')) {
    throw new Error(`file entry name must not end with "/": ${fileName}`)
  }
  assertSafeZipEntryName(name)
  return name
}

function clampInt32(n: number): number {
  if (n < -0x80000000) return -0x80000000
  if (n > 0x7fffffff) return 0x7fffffff
  return n
}

interface FileToZip {
  absPath: string
  /** Entry name inside the archive (forward-slash separated). */
  name: string
}

/**
 * Expand input paths (files and/or directories) into a flat list of files to add,
 * resolving each entry's archive name relative to `baseDir` (or each input's parent).
 */
async function collectFiles(inputs: string[], baseDir: string | undefined): Promise<FileToZip[]> {
  const files: FileToZip[] = []
  for (const input of inputs) {
    const stats = await fsp.stat(input)
    const base = baseDir ? path.resolve(baseDir) : path.dirname(input)
    if (stats.isDirectory()) {
      // `glob` does the recursive walk and (with the default `onlyFiles`) drops
      // directories; `**` is the only pattern and `input` is the cwd (never
      // interpreted), so paths containing glob metacharacters stay safe. Sorted
      // for deterministic archives.
      const relPaths = (await glob('**', { cwd: input, dot: true })).sort(comparators.localeAsc)
      for (const rel of relPaths) {
        const absPath = path.join(input, rel)
        files.push({ absPath, name: toEntryName(path.relative(base, absPath)) })
      }
    } else {
      files.push({ absPath: input, name: toEntryName(path.relative(base, input)) })
    }
  }
  return files
}

/** Convert an OS-native relative path into a forward-slash zip entry name. */
function toEntryName(relPath: string): string {
  return path.sep === '/' ? relPath : relPath.replaceAll(path.sep, '/')
}

const EMPTY: Buffer = Buffer.alloc(0)
const LOCAL_FILE_HEADER_SIZE = 30
const DATA_DESCRIPTOR_SIZE = 16
const ZIP64_DATA_DESCRIPTOR_SIZE = 24
const INFO_ZIP_TIMESTAMP_FIELD_SIZE = 9
const ZIP64_EIEF_SIZE = 28
// version made by: 3 (Unix) in the high byte, spec version 6.3 (63) in the low byte.
const VERSION_MADE_BY = (3 << 8) | 63
const VERSION_NEEDED_UTF8 = 20
const VERSION_NEEDED_ZIP64 = 45
const FILE_NAME_IS_UTF8 = 1 << 11
const UNKNOWN_CRC32_AND_FILE_SIZES = 1 << 3
const EB_UT_FL_MTIME = 1 << 0
const EB_UT_FL_ATIME = 1 << 1
const DEFAULT_FILE_MODE = 0o100664
const DEFAULT_DIR_MODE = 0o40775
const DEFAULT_DEFLATE_LEVEL = 6
// The 4-byte end-of-central-directory signature, as bytes, for comment validation.
const EOCDR_SIG_BYTES = Buffer.from([0x50, 0x4b, 0x05, 0x06])

/**
 * Per-entry options for {@link ZipWriter} add methods.
 */
export interface ZipWriterEntryOptions {
  /**
   * Compress the entry with deflate. Default `true` for files, always `false`
   * for directories. Set to `false` to store the bytes uncompressed.
   */
  compress?: boolean
  /**
   * Deflate level, `0`-`9`. Implies compression; `0` means stored.
   * Default `6`. Ignored when {@link compress} is `false`.
   */
  level?: number
  /**
   * Last modification time, as a Unix timestamp in seconds. Default: now.
   */
  mtime?: UnixTimestamp
  /**
   * Unix file mode bits (low 16 bits), e.g. `0o644`.
   * Default `0o664` for files, `0o775` for directories.
   */
  mode?: number
  /**
   * Optional per-entry comment.
   */
  comment?: string
  /**
   * Force ZIP64 format for this entry. ZIP64 is also enabled automatically for
   * entries larger than ~4 GiB or located past the 4 GiB offset; set this when
   * adding a stream you know will be large.
   */
  forceZip64?: boolean
}

/**
 * Options for {@link ZipWriter.finalize}.
 */
export interface ZipFinalizeOptions {
  /**
   * Archive-level comment. Must not contain the end-of-central-directory signature.
   */
  comment?: string
  /**
   * Force ZIP64 end-of-central-directory records, regardless of size/count.
   */
  forceZip64?: boolean
}

/**
 * A single entry for {@link createZipBuffer}.
 */
export interface ZipFileEntry extends ZipWriterEntryOptions {
  /**
   * Entry name (path inside the archive), using `/` as the separator.
   */
  name: string
  /**
   * File contents. Omit to create a directory entry (a trailing `/` is added
   * to {@link name} if missing). An empty `content` still creates a file.
   */
  content?: Buffer
}
