/*

A minimal, dependency-free zip archive reader for Node.js 24+.

Adapted from yauzl (https://github.com/thejoshwolfe/yauzl) by Josh Wolfe (MIT License),
rewritten in a modern, Promise-based, async/await style:

- No external dependencies. `buffer-crc32` is replaced by the built-in `zlib.crc32`,
  `fd-slicer`/`pend` are replaced by `node:fs/promises` FileHandle reads.
- Promise API instead of callbacks/EventEmitter (inspired by yauzl PR #171).
- The central directory is parsed eagerly into `ZipReader.entries`.
- Scope is intentionally small: read/extract `stored` (0) and `deflate` (8) entries.
  Encryption and other compression methods are detected and rejected, not implemented.

Robustness kept from yauzl: backwards EOCD search, ZIP64 reading, bounds checks,
file name decoding (UTF-8, cp437, Info-ZIP Unicode Path field) and path-traversal
validation.

 */

import { isUtf8 } from 'node:buffer'
import { createReadStream, createWriteStream } from 'node:fs'
import fsp from 'node:fs/promises'
import type { FileHandle } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { promisify } from 'node:util'
import zlib from 'node:zlib'
import type { UnixTimestamp } from '@naturalcycles/js-lib/types'
import {
  assertSafeZipEntryName,
  CDFH_SIG,
  CDFH_SIZE,
  DEFLATE,
  dosDateTimeToUnix,
  EOCDR_SIG,
  EOCDR_SIZE,
  LOCAL_FILE_HEADER_SIG,
  MAX_COMMENT_SIZE,
  normalizeZipEntryName,
  readUInt64LE,
  STORED,
  ZIP64_EOCDL_SIG,
  ZIP64_EOCDL_SIZE,
  ZIP64_EOCDR_SIG,
  ZIP64_EOCDR_SIZE,
} from './zipInternal.js'

// oxlint-disable no-bitwise -- parsing the binary ZIP format requires bitwise ops on bit flags and packed DOS date/time fields

const inflateRawAsync = promisify(zlib.inflateRaw.bind(zlib))

/**
 * Open a zip archive from a file on disk.
 *
 * Reads and parses the central directory; the returned {@link ZipReader} exposes
 * the list of entries and lets you read their contents.
 *
 * Remember to call {@link ZipReader.close} when done, or use {@link extractZip}.
 */
export async function openZip(filePath: string): Promise<ZipReader> {
  const fileHandle = await fsp.open(filePath, 'r')
  let source: FileSource
  try {
    const { size } = await fileHandle.stat()
    source = new FileSource(fileHandle, filePath, size)
  } catch (err) {
    await fileHandle.close()
    throw err
  }
  return await readArchive(source)
}

/**
 * Open a zip archive from an in-memory Buffer.
 */
export async function openZipBuffer(buffer: Buffer): Promise<ZipReader> {
  return await readArchive(new BufferSource(buffer))
}

/**
 * Reads entries from an open zip archive.
 *
 * Create one via {@link openZip} or {@link openZipBuffer}.
 *
 * Implements `AsyncDisposable`, so it can be used with `await using` to close
 * automatically on scope exit:
 *
 * ```ts
 * await using zip = await openZip('archive.zip')
 * const buf = await zip.readEntry(zip.entries[0])
 * // zip.close() is called automatically here
 * ```
 */
export class ZipReader implements AsyncDisposable {
  constructor(
    private source: ZipSource,
    /**
     * All entries (files and directories) found in the archive,
     * in central-directory order.
     */
    readonly entries: ZipEntry[],
    /**
     * Archive-level comment (empty string if none).
     */
    readonly comment: string,
  ) {}

  /**
   * Read and fully decompress an entry into a Buffer.
   *
   * Validates the uncompressed size and CRC-32 checksum.
   * For large entries prefer {@link openReadStream}.
   */
  async readEntry(entry: ZipEntry): Promise<Buffer> {
    this.assertReadable(entry)
    const fileDataStart = await this.findFileDataStart(entry)
    const raw = await this.source.read(fileDataStart, entry.compressedSize)
    const data = entry.compressionMethod === STORED ? raw : await inflateRawAsync(raw)

    if (data.length !== entry.uncompressedSize) {
      throw new Error(
        `uncompressed size mismatch for ${entry.fileName}: expected ${entry.uncompressedSize}, got ${data.length}`,
      )
    }
    const actualCrc = zlib.crc32(data)
    if (actualCrc !== entry.crc32) {
      throw new Error(
        `crc32 mismatch for ${entry.fileName}: expected ${entry.crc32}, got ${actualCrc}`,
      )
    }
    return data
  }

  /**
   * Open a Readable stream of an entry's decompressed contents.
   *
   * Useful for piping large entries to disk without buffering them in memory.
   * Unlike {@link readEntry}, this does not verify the CRC-32 checksum.
   */
  async openReadStream(entry: ZipEntry): Promise<Readable> {
    this.assertReadable(entry)
    const fileDataStart = await this.findFileDataStart(entry)
    const raw = this.source.createReadStream(fileDataStart, fileDataStart + entry.compressedSize)
    if (entry.compressionMethod === STORED) return raw

    const inflate = zlib.createInflateRaw()
    // Forward read errors into the decompression stream, and tear down the source
    // stream if the consumer abandons the decompression stream early.
    raw.once('error', err => inflate.destroy(err))
    inflate.once('close', () => {
      if (!raw.destroyed) raw.destroy()
    })
    raw.pipe(inflate)
    return inflate
  }

  /**
   * Extract all entries into `destDir`, streaming each file to disk.
   * See {@link extractZip}.
   */
  async extractAll(destDir: string): Promise<ZipEntry[]> {
    const root = path.resolve(destDir)
    for (const entry of this.entries) {
      const targetPath = assertPathInside(root, entry.fileName)
      if (entry.isDirectory) {
        await fsp.mkdir(targetPath, { recursive: true })
        continue
      }
      await fsp.mkdir(path.dirname(targetPath), { recursive: true })
      const readStream = await this.openReadStream(entry)
      await pipeline(readStream, createWriteStream(targetPath))
    }
    return this.entries
  }

  /**
   * Close the underlying file handle. No-op for buffer-backed archives.
   * Safe to call multiple times.
   */
  async close(): Promise<void> {
    await this.source.close()
  }

  /**
   * Called by `await using`; closes the archive. See {@link close}.
   */
  async [Symbol.asyncDispose](): Promise<void> {
    await this.close()
  }

  private assertReadable(entry: ZipEntry): void {
    if (entry.isEncrypted) {
      throw new Error(`encrypted entries are not supported: ${entry.fileName}`)
    }
    if (entry.compressionMethod !== STORED && entry.compressionMethod !== DEFLATE) {
      throw new Error(
        `unsupported compression method ${entry.compressionMethod} for ${entry.fileName}`,
      )
    }
  }

  /**
   * Read the local file header to locate the start of the entry's data.
   * The local header's name/extra-field lengths can differ from the central
   * directory's, so this must be read per entry.
   */
  private async findFileDataStart(entry: ZipEntry): Promise<number> {
    const header = await this.source.read(entry.relativeOffsetOfLocalHeader, 30)
    const signature = header.readUInt32LE(0)
    if (signature !== LOCAL_FILE_HEADER_SIG) {
      throw new Error(`invalid local file header signature: 0x${signature.toString(16)}`)
    }
    const fileNameLength = header.readUInt16LE(26)
    const extraFieldLength = header.readUInt16LE(28)
    const fileDataStart = entry.relativeOffsetOfLocalHeader + 30 + fileNameLength + extraFieldLength
    if (fileDataStart + entry.compressedSize > this.source.size) {
      throw new Error(`file data overflows archive bounds for ${entry.fileName}`)
    }
    return fileDataStart
  }
}

async function readArchive(source: ZipSource): Promise<ZipReader> {
  try {
    const eocd = await readEndOfCentralDirectory(source)
    const cdSize = eocd.centralDirectoryEnd - eocd.centralDirectoryOffset
    if (eocd.centralDirectoryOffset < 0 || cdSize < 0 || eocd.centralDirectoryEnd > source.size) {
      throw new Error('invalid central directory location')
    }
    const centralDirectory = await source.read(eocd.centralDirectoryOffset, cdSize)
    const entries = parseCentralDirectory(centralDirectory, eocd.entryCount)
    return new ZipReader(source, entries, eocd.comment)
  } catch (err) {
    await source.close()
    throw err
  }
}

interface EndOfCentralDirectory {
  entryCount: number
  centralDirectoryOffset: number
  /** Byte offset where the central directory region ends (start of the EOCD / ZIP64 EOCD). */
  centralDirectoryEnd: number
  comment: string
}

/**
 * The End of Central Directory (EOCD) record sits at the very end of the file,
 * followed only by a variable-length comment, so we search backwards for its
 * signature. A ZIP64 EOCD locator may precede it for large archives.
 */
async function readEndOfCentralDirectory(source: ZipSource): Promise<EndOfCentralDirectory> {
  const { size } = source
  if (size < EOCDR_SIZE) {
    throw new Error('not a zip file: file is too small')
  }
  const searchLength = Math.min(EOCDR_SIZE + MAX_COMMENT_SIZE + ZIP64_EOCDL_SIZE, size)
  const searchStart = size - searchLength
  const buf = await source.read(searchStart, searchLength)

  for (let i = buf.length - EOCDR_SIZE; i >= 0; i--) {
    if (buf.readUInt32LE(i) !== EOCDR_SIG) continue
    const eocdr = buf.subarray(i)
    const diskNumber = eocdr.readUInt16LE(4)
    let entryCount = eocdr.readUInt16LE(10)
    let centralDirectoryOffset = eocdr.readUInt32LE(16)
    const commentLength = eocdr.readUInt16LE(20)
    const expectedCommentLength = eocdr.length - EOCDR_SIZE
    if (commentLength !== expectedCommentLength) {
      throw new Error(
        `invalid comment length: expected ${expectedCommentLength}, found ${commentLength}`,
      )
    }
    // The EOCD comment is always cp437-encoded.
    const comment = decodeBuffer(eocdr.subarray(EOCDR_SIZE), false)
    // The central directory region ends where this EOCD record begins.
    let centralDirectoryEnd = searchStart + i

    // A ZIP64 End of Central Directory Locator sits immediately before the EOCD.
    const locatorIndex = i - ZIP64_EOCDL_SIZE
    if (locatorIndex >= 0 && buf.readUInt32LE(locatorIndex) === ZIP64_EOCDL_SIG) {
      const zip64EocdrOffset = readUInt64LE(buf, locatorIndex + 8)
      const zip64 = await source.read(zip64EocdrOffset, ZIP64_EOCDR_SIZE)
      if (zip64.readUInt32LE(0) !== ZIP64_EOCDR_SIG) {
        throw new Error('invalid zip64 end of central directory record signature')
      }
      if (zip64.readUInt32LE(16) !== 0) {
        throw new Error('multi-disk zip files are not supported')
      }
      entryCount = readUInt64LE(zip64, 32)
      centralDirectoryOffset = readUInt64LE(zip64, 48)
      centralDirectoryEnd = zip64EocdrOffset
    } else if (diskNumber !== 0) {
      throw new Error('multi-disk zip files are not supported')
    }

    return { entryCount, centralDirectoryOffset, centralDirectoryEnd, comment }
  }

  throw new Error('end of central directory record not found: not a zip file, or it is truncated')
}

function parseCentralDirectory(buf: Buffer, entryCount: number): ZipEntry[] {
  const entries: ZipEntry[] = []
  let cursor = 0
  for (let n = 0; n < entryCount; n++) {
    if (cursor + CDFH_SIZE > buf.length) {
      throw new Error('central directory is truncated')
    }
    const signature = buf.readUInt32LE(cursor)
    if (signature !== CDFH_SIG) {
      throw new Error(
        `invalid central directory file header signature: 0x${signature.toString(16)}`,
      )
    }
    const generalPurposeBitFlag = buf.readUInt16LE(cursor + 8)
    const compressionMethod = buf.readUInt16LE(cursor + 10)
    const lastModFileTime = buf.readUInt16LE(cursor + 12)
    const lastModFileDate = buf.readUInt16LE(cursor + 14)
    const crc32 = buf.readUInt32LE(cursor + 16)
    let compressedSize = buf.readUInt32LE(cursor + 20)
    let uncompressedSize = buf.readUInt32LE(cursor + 24)
    const fileNameLength = buf.readUInt16LE(cursor + 28)
    const extraFieldLength = buf.readUInt16LE(cursor + 30)
    const fileCommentLength = buf.readUInt16LE(cursor + 32)
    let relativeOffsetOfLocalHeader = buf.readUInt32LE(cursor + 42)

    if (generalPurposeBitFlag & 0x40) {
      throw new Error('strong encryption is not supported')
    }

    const nameStart = cursor + CDFH_SIZE
    const extraStart = nameStart + fileNameLength
    const commentStart = extraStart + extraFieldLength
    const entryEnd = commentStart + fileCommentLength
    if (entryEnd > buf.length) {
      throw new Error('central directory entry overflows the central directory')
    }

    const fileNameRaw = buf.subarray(nameStart, extraStart)
    const extraFieldRaw = buf.subarray(extraStart, commentStart)
    const fileCommentRaw = buf.subarray(commentStart, entryEnd)
    const extraFields = parseExtraFields(extraFieldRaw)

    // ZIP64: when a 32-bit field holds the 0xffffffff sentinel, the real value
    // lives in the 0x0001 extra field.
    const zip64 = readZip64ExtraField(
      extraFields,
      uncompressedSize,
      compressedSize,
      relativeOffsetOfLocalHeader,
    )
    uncompressedSize = zip64.uncompressedSize
    compressedSize = zip64.compressedSize
    relativeOffsetOfLocalHeader = zip64.relativeOffsetOfLocalHeader

    const hasUtf8Flag = (generalPurposeBitFlag & 0x800) !== 0
    const fileName = decodeFileName(generalPurposeBitFlag, fileNameRaw, extraFields)
    assertSafeZipEntryName(fileName)

    entries.push({
      fileName,
      uncompressedSize,
      compressedSize,
      compressionMethod,
      crc32,
      lastModified: parseLastModified(lastModFileDate, lastModFileTime, extraFields),
      isDirectory: fileName.endsWith('/'),
      isEncrypted: (generalPurposeBitFlag & 0x1) !== 0,
      comment: decodeBuffer(fileCommentRaw, hasUtf8Flag),
      generalPurposeBitFlag,
      relativeOffsetOfLocalHeader,
    })

    cursor = entryEnd
  }
  return entries
}

interface ExtraField {
  id: number
  data: Buffer
}

function parseExtraFields(buf: Buffer): ExtraField[] {
  const fields: ExtraField[] = []
  let i = 0
  while (i < buf.length - 3) {
    const id = buf.readUInt16LE(i)
    const dataSize = buf.readUInt16LE(i + 2)
    const dataStart = i + 4
    const dataEnd = dataStart + dataSize
    if (dataEnd > buf.length) {
      throw new Error('extra field length exceeds extra field buffer size')
    }
    fields.push({ id, data: buf.subarray(dataStart, dataEnd) })
    i = dataEnd
  }
  return fields
}

function readZip64ExtraField(
  extraFields: ExtraField[],
  uncompressedSize: number,
  compressedSize: number,
  relativeOffsetOfLocalHeader: number,
): { uncompressedSize: number; compressedSize: number; relativeOffsetOfLocalHeader: number } {
  const zip64 = extraFields.find(f => f.id === 0x0001)
  if (!zip64) {
    return { uncompressedSize, compressedSize, relativeOffsetOfLocalHeader }
  }
  const { data } = zip64
  let index = 0
  const next = (): number => {
    if (index + 8 > data.length) {
      throw new Error('zip64 extended information extra field is too short')
    }
    const value = readUInt64LE(data, index)
    index += 8
    return value
  }
  // Fields appear in this fixed order, but only the ones using the sentinel are present.
  if (uncompressedSize === 0xffffffff) uncompressedSize = next()
  if (compressedSize === 0xffffffff) compressedSize = next()
  if (relativeOffsetOfLocalHeader === 0xffffffff) relativeOffsetOfLocalHeader = next()
  return { uncompressedSize, compressedSize, relativeOffsetOfLocalHeader }
}

function decodeFileName(
  generalPurposeBitFlag: number,
  fileNameRaw: Buffer,
  extraFields: ExtraField[],
): string {
  // Info-ZIP Unicode Path Extra Field (0x7075): an authoritative UTF-8 name,
  // used only if its stored CRC-32 matches the raw name. See yauzl#33.
  const unicodePath = extraFields.find(f => f.id === 0x7075)
  if (
    unicodePath &&
    unicodePath.data.length >= 6 &&
    unicodePath.data.readUInt8(0) === 1 &&
    unicodePath.data.readUInt32LE(1) === zlib.crc32(fileNameRaw)
  ) {
    return normalizeZipEntryName(unicodePath.data.subarray(5).toString('utf8'))
  }

  const hasUtf8Flag = (generalPurposeBitFlag & 0x800) !== 0
  return normalizeZipEntryName(decodeBuffer(fileNameRaw, hasUtf8Flag))
}

function parseLastModified(date: number, time: number, extraFields: ExtraField[]): UnixTimestamp {
  // Prefer the Info-ZIP "UT" extended timestamp (0x5455) if it carries mtime.
  // Its payload is already a Unix timestamp in seconds.
  const ut = extraFields.find(f => f.id === 0x5455)
  if (ut && ut.data.length >= 5 && (ut.data.readUInt8(0) & 0x01) !== 0) {
    return ut.data.readInt32LE(1) as UnixTimestamp
  }
  return dosDateTimeToUnix(date, time)
}

function decodeBuffer(buf: Buffer, hasUtf8Flag: boolean): string {
  // Many tools (Info-ZIP, Linux `zip`) store UTF-8 names without setting the UTF-8
  // flag, so also trust UTF-8 when the bytes are valid UTF-8; else fall back to cp437.
  if (hasUtf8Flag || isUtf8(buf)) return buf.toString('utf8')
  // Legacy cp437: ASCII passthrough for 0x00-0x7f, lookup table for the high half.
  let result = ''
  for (const byte of buf) {
    result += byte < 0x80 ? String.fromCodePoint(byte) : CP437_HIGH.charAt(byte - 0x80)
  }
  return result
}

function assertPathInside(root: string, fileName: string): string {
  const targetPath = path.resolve(root, fileName)
  if (targetPath !== root && !targetPath.startsWith(root + path.sep)) {
    throw new Error(`zip entry escapes destination directory: ${fileName}`)
  }
  return targetPath
}

/**
 * Random-access byte source backing a {@link ZipReader}.
 */
interface ZipSource {
  readonly size: number
  /** Read exactly `length` bytes starting at `position`; throws on EOF. */
  read: (position: number, length: number) => Promise<Buffer>
  /** Stream raw bytes in the `[start, end)` range. */
  createReadStream: (start: number, end: number) => Readable
  /** Release any held resources. Idempotent. */
  close: () => Promise<void>
}

class FileSource implements ZipSource {
  private closed = false
  constructor(
    private fileHandle: FileHandle,
    private filePath: string,
    readonly size: number,
  ) {}

  async read(position: number, length: number): Promise<Buffer> {
    if (length === 0) return Buffer.alloc(0)
    const buf = Buffer.allocUnsafe(length)
    let read = 0
    while (read < length) {
      const { bytesRead } = await this.fileHandle.read(buf, read, length - read, position + read)
      if (bytesRead === 0) {
        throw new Error(`unexpected EOF: read ${read} of ${length} bytes at offset ${position}`)
      }
      read += bytesRead
    }
    return buf
  }

  createReadStream(start: number, end: number): Readable {
    if (start >= end) return Readable.from([])
    // Stream via a fresh, self-contained fd rather than the shared FileHandle: its
    // own autoClose closes only that fd on stream end/destroy, leaving the handle
    // (used for positioned header reads) intact. `end` is inclusive here, hence -1.
    return createReadStream(this.filePath, { start, end: end - 1 })
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    await this.fileHandle.close()
  }
}

class BufferSource implements ZipSource {
  constructor(private buffer: Buffer) {}

  get size(): number {
    return this.buffer.length
  }

  async read(position: number, length: number): Promise<Buffer> {
    if (position + length > this.buffer.length) {
      throw new Error(`unexpected EOF: cannot read ${length} bytes at offset ${position}`)
    }
    return this.buffer.subarray(position, position + length)
  }

  createReadStream(start: number, end: number): Readable {
    if (start >= end) return Readable.from([])
    return Readable.from(chunkBuffer(this.buffer.subarray(start, end)))
  }

  async close(): Promise<void> {
    return
  }
}

/**
 * Split a buffer into smaller chunks for friendlier memory usage when piping
 * into a decompression stream. See yauzl#87.
 */
function* chunkBuffer(buf: Buffer, chunkSize = 0x10000): Generator<Buffer> {
  for (let offset = 0; offset < buf.length; offset += chunkSize) {
    yield buf.subarray(offset, offset + chunkSize)
  }
}

// cp437 high half (bytes 0x80-0xff), used to decode legacy (non-UTF-8) names/comments.
// The last entry (0xff) is a non-breaking space (U+00A0).
const CP437_HIGH =
  'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ '

/**
 * A single entry (file or directory) inside a zip archive,
 * as parsed from its central directory record.
 */
export interface ZipEntry {
  /**
   * Entry name, using `/` as the path separator.
   * Directory entries end with a trailing `/`.
   */
  fileName: string
  /**
   * Uncompressed size, in bytes.
   */
  uncompressedSize: number
  /**
   * Compressed size, in bytes.
   */
  compressedSize: number
  /**
   * Compression method: `0` = stored (no compression), `8` = deflate.
   * Other methods cannot be read.
   */
  compressionMethod: number
  /**
   * Expected CRC-32 checksum of the uncompressed data.
   */
  crc32: number
  /**
   * Last modification time of the entry, as a Unix timestamp in seconds.
   */
  lastModified: UnixTimestamp
  /**
   * True if the entry is a directory (its `fileName` ends with `/`).
   */
  isDirectory: boolean
  /**
   * True if the entry is encrypted. Encrypted entries cannot be read.
   */
  isEncrypted: boolean
  /**
   * Optional per-entry comment (empty string if none).
   */
  comment: string

  // Low-level fields needed to locate the entry's data within the archive.
  /** Bit flags from the central directory record. */
  generalPurposeBitFlag: number
  /** Byte offset of the entry's local file header. */
  relativeOffsetOfLocalHeader: number
}
