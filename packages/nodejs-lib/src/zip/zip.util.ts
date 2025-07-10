import { promisify } from 'node:util'
import type { ZlibOptions } from 'node:zlib'
import zlib from 'node:zlib'

const deflate = promisify(zlib.deflate.bind(zlib))
const inflate = promisify(zlib.inflate.bind(zlib))
const gzip = promisify(zlib.gzip.bind(zlib))
const gunzip = promisify(zlib.gunzip.bind(zlib))

/**
 * deflateBuffer uses `deflate`.
 * It's 9 bytes shorter than `gzip`.
 */
export async function deflateBuffer(buf: Buffer, options: ZlibOptions = {}): Promise<Buffer> {
  return await deflate(buf, options)
}

export async function inflateBuffer(buf: Buffer, options: ZlibOptions = {}): Promise<Buffer> {
  return await inflate(buf, options)
}

/**
 * deflateString uses `deflate`.
 * It's 9 bytes shorter than `gzip`.
 */
export async function deflateString(s: string, options?: ZlibOptions): Promise<Buffer> {
  return await deflateBuffer(Buffer.from(s), options)
}

export async function inflateToString(buf: Buffer, options?: ZlibOptions): Promise<string> {
  return (await inflateBuffer(buf, options)).toString()
}

/**
 * gzipBuffer uses `gzip`
 * It's 9 bytes longer than `deflate`.
 */
export async function gzipBuffer(buf: Buffer, options: ZlibOptions = {}): Promise<Buffer> {
  return await gzip(buf, options)
}

export async function gunzipBuffer(buf: Buffer, options: ZlibOptions = {}): Promise<Buffer> {
  return await gunzip(buf, options)
}

/**
 * gzipString uses `gzip`.
 * It's 9 bytes longer than `deflate`.
 */
export async function gzipString(s: string, options?: ZlibOptions): Promise<Buffer> {
  return await gzipBuffer(Buffer.from(s), options)
}

export async function gunzipToString(buf: Buffer, options?: ZlibOptions): Promise<string> {
  return (await gunzipBuffer(buf, options)).toString()
}
