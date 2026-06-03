/*

Shared low-level helpers and constants for the zip reader and writer.

These are the parts of the ZIP file format that both reading (`zipReader.ts`) and
writing (`zipWriter.ts`) need in common: record signatures and fixed sizes, 64-bit
integer read/write helpers, DOS date/time conversion (both directions) and
entry-name normalization/validation.

 */

import type { UnixTimestamp } from '@naturalcycles/js-lib/types'

// oxlint-disable no-bitwise -- the ZIP format packs DOS date/time into bit fields

// Compression methods.
export const STORED = 0
export const DEFLATE = 8

// Record signatures (little-endian uint32) and fixed sizes (in bytes).
export const LOCAL_FILE_HEADER_SIG = 0x04034b50
export const DATA_DESCRIPTOR_SIG = 0x08074b50
export const CDFH_SIG = 0x02014b50
export const CDFH_SIZE = 46
export const EOCDR_SIG = 0x06054b50
export const EOCDR_SIZE = 22
export const ZIP64_EOCDL_SIG = 0x07064b50
export const ZIP64_EOCDL_SIZE = 20
export const ZIP64_EOCDR_SIG = 0x06064b50
export const ZIP64_EOCDR_SIZE = 56

/** The .zip comment and per-entry name/comment length fields are all 16-bit. */
export const MAX_COMMENT_SIZE = 0xffff

const MAX_SAFE_INTEGER_BIG = BigInt(Number.MAX_SAFE_INTEGER)

/** Read a 64-bit little-endian unsigned integer, rejecting values above `Number.MAX_SAFE_INTEGER`. */
export function readUInt64LE(buf: Buffer, offset: number): number {
  const value = buf.readBigUInt64LE(offset)
  if (value > MAX_SAFE_INTEGER_BIG) {
    throw new Error(
      'zip file too large: 64-bit values above Number.MAX_SAFE_INTEGER are not supported',
    )
  }
  return Number(value)
}

/** Write a 64-bit little-endian unsigned integer. */
export function writeUInt64LE(buf: Buffer, value: number, offset: number): void {
  buf.writeBigUInt64LE(BigInt(value), offset)
}

/**
 * Decode a packed DOS date + time pair into a {@link UnixTimestamp} (seconds).
 * The DOS fields are local-time, so they are interpreted in the local timezone.
 * Used when no Info-ZIP extended timestamp is present.
 */
export function dosDateTimeToUnix(date: number, time: number): UnixTimestamp {
  const day = date & 0x1f // 1-31
  const month = ((date >> 5) & 0x0f) - 1 // 1-12 -> 0-11
  const year = ((date >> 9) & 0x7f) + 1980 // 0-127 -> 1980-2107
  const second = (time & 0x1f) * 2 // 0-29 -> 0-58
  const minute = (time >> 5) & 0x3f // 0-59
  const hour = (time >> 11) & 0x1f // 0-23
  return Math.floor(
    new Date(year, month, day, hour, minute, second).getTime() / 1000,
  ) as UnixTimestamp
}

const MIN_DOS_DATE = new Date(1980, 0, 1)
const MAX_DOS_DATE = new Date(2107, 11, 31, 23, 59, 58)

/**
 * Encode a {@link UnixTimestamp} (seconds) into the packed DOS date + time pair stored
 * in local file and central directory headers. The DOS fields are local-time, so the
 * timestamp is rendered in the local timezone. Out-of-range dates are clamped to 1980-2107.
 */
export function unixToDosDateTime(ts: UnixTimestamp): { date: number; time: number } {
  const jsDate = new Date(ts * 1000)
  const d = jsDate < MIN_DOS_DATE ? MIN_DOS_DATE : jsDate > MAX_DOS_DATE ? MAX_DOS_DATE : jsDate

  const date =
    (d.getDate() & 0x1f) | // 1-31
    (((d.getMonth() + 1) & 0x0f) << 5) | // 1-12
    (((d.getFullYear() - 1980) & 0x7f) << 9) // 1980-2107

  const time =
    Math.floor(d.getSeconds() / 2) | // 0-29
    ((d.getMinutes() & 0x3f) << 5) | // 0-59
    ((d.getHours() & 0x1f) << 11) // 0-23

  return { date, time }
}

/** Normalize Windows-style separators, like yauzl in non-strict mode. */
export function normalizeZipEntryName(name: string): string {
  return name.replaceAll('\\', '/')
}

/**
 * Reject entry names that would escape the extraction directory: absolute paths
 * (drive letters or a leading `/`) and any `..` path segment.
 */
export function assertSafeZipEntryName(name: string): void {
  if (/^[a-z]:/i.test(name) || name.startsWith('/')) {
    throw new Error(`absolute path in zip entry: ${name}`)
  }
  if (name.split('/').includes('..')) {
    throw new Error(`invalid relative path in zip entry: ${name}`)
  }
}
