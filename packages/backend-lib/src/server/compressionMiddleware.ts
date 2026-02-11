/* !
 * Compression middleware forked from `compression` npm package.
 * With added zstd support based on https://github.com/expressjs/compression/pull/250
 *
 * Original copyright:
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

import zlib from 'node:zlib'
import compressible from 'compressible'
// @ts-expect-error no types
import Negotiator from 'negotiator'
import onHeaders from 'on-headers'
import vary from 'vary'
import type { BackendRequest, BackendRequestHandler, BackendResponse } from './server.model.js'

export interface CompressionOptions {
  /**
   * Custom filter function to determine if response should be compressed.
   * Default checks if Content-Type is compressible.
   */
  filter?: (req: BackendRequest, res: BackendResponse) => boolean

  /**
   * Minimum response size in bytes to compress.
   * @default 1024
   */
  threshold?: number | string

  /**
   * Encoding to use when Accept-Encoding header is not present.
   * @default 'identity'
   */
  enforceEncoding?: 'gzip' | 'deflate' | 'br' | 'zstd' | 'identity'

  /**
   * zlib options for gzip/deflate.
   */
  level?: number
  memLevel?: number
  strategy?: number
  windowBits?: number
  chunkSize?: number

  /**
   * Brotli-specific options.
   */
  brotli?: {
    params?: Record<number, number>
  }

  /**
   * Zstd-specific options.
   */
  zstd?: {
    params?: Record<number, number>
  }
}

const SUPPORTED_ENCODING = ['zstd', 'br', 'gzip', 'deflate', 'identity']
const PREFERRED_ENCODING = ['zstd', 'br', 'gzip']

const encodingSupported = new Set(['gzip', 'deflate', 'identity', 'br', 'zstd'])

const cacheControlNoTransformRegExp = /(?:^|,)\s*?no-transform\s*?(?:,|$)/i

/**
 * Compression middleware with support for gzip, deflate, brotli, and zstd.
 *
 * This is a fork of the `compression` npm package with added zstd support.
 *
 * Encoding preference order: zstd > br > gzip > deflate
 */
export function compressionMiddleware(options?: CompressionOptions): BackendRequestHandler {
  const opts = options || {}

  // Brotli options
  const optsBrotli: zlib.BrotliOptions = {
    ...opts.brotli,
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 4,
      ...opts.brotli?.params,
    },
  }

  // Zstd options
  const optsZstd: zlib.ZstdOptions = {
    ...opts.zstd,
    params: {
      [zlib.constants.ZSTD_c_compressionLevel]: 3,
      ...opts.zstd?.params,
    },
  }

  // General zlib options for gzip/deflate
  const zlibOpts: zlib.ZlibOptions = {}
  if (opts.level !== undefined) zlibOpts.level = opts.level
  if (opts.memLevel !== undefined) zlibOpts.memLevel = opts.memLevel
  if (opts.strategy !== undefined) zlibOpts.strategy = opts.strategy
  if (opts.windowBits !== undefined) zlibOpts.windowBits = opts.windowBits
  if (opts.chunkSize !== undefined) zlibOpts.chunkSize = opts.chunkSize

  const filter = opts.filter || shouldCompress
  const threshold = parseBytes(opts.threshold) ?? 1024
  const enforceEncoding = opts.enforceEncoding || 'identity'

  return function compression(req, res, next) {
    let ended = false
    let length: number | undefined
    let listeners: [string, (...args: any[]) => void][] | null = []
    let stream: zlib.Gzip | zlib.Deflate | zlib.BrotliCompress | zlib.ZstdCompress | undefined

    // oxlint-disable-next-line typescript/unbound-method -- monkey-patching, rebound via .call()
    const _end = res.end
    // oxlint-disable-next-line typescript/unbound-method -- monkey-patching, rebound via .call()
    const _on = res.on
    // oxlint-disable-next-line typescript/unbound-method -- monkey-patching, rebound via .call()
    const _write = res.write

    // flush
    ;(res as any).flush = function flush() {
      if (stream) {
        stream.flush()
      }
    }

    // proxy write
    res.write = function write(
      chunk: any,
      encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
      callback?: (error?: Error | null) => void,
    ): boolean {
      if (ended) {
        return false
      }

      if (!headersSent(res)) {
        res.writeHead(res.statusCode)
      }

      if (stream) {
        return stream.write(toBuffer(chunk, encodingOrCallback as BufferEncoding))
      }
      return _write.call(res, chunk, encodingOrCallback as BufferEncoding, callback as any)
    }

    // proxy end
    res.end = function end(
      chunk?: any,
      encodingOrCallback?: BufferEncoding | (() => void),
      callback?: () => void,
    ): any {
      if (ended) {
        return res
      }

      if (!headersSent(res)) {
        // estimate the length
        if (!res.getHeader('Content-Length')) {
          length = chunkLength(chunk, encodingOrCallback as BufferEncoding)
        }
        res.writeHead(res.statusCode)
      }

      if (!stream) {
        return _end.call(res, chunk, encodingOrCallback as BufferEncoding, callback)
      }

      // mark ended
      ended = true

      // write Buffer
      if (chunk) {
        stream.end(toBuffer(chunk, encodingOrCallback as BufferEncoding))
      } else {
        stream.end()
      }

      return res
    }
    ;(res as any).on = function on(type: string, listener: (...args: any[]) => void) {
      if (!listeners || type !== 'drain') {
        return _on.call(res, type, listener)
      }

      if (stream) {
        return stream.on(type, listener)
      }

      // buffer listeners for future stream
      listeners.push([type, listener])

      return res
    }

    function nocompress(_msg: string): void {
      addListeners(res, _on, listeners!)
      listeners = null
    }

    onHeaders(res, function onResponseHeaders() {
      // determine if request is filtered
      if (!filter(req, res)) {
        nocompress('filtered')
        return
      }

      // determine if the entity should be transformed
      if (!shouldTransform(req, res)) {
        nocompress('no transform')
        return
      }

      // vary
      vary(res, 'Accept-Encoding')

      // content-length below threshold
      if (
        Number(res.getHeader('Content-Length')) < threshold ||
        (length !== undefined && length < threshold)
      ) {
        nocompress('size below threshold')
        return
      }

      const encoding = (res.getHeader('Content-Encoding') as string) || 'identity'

      // already encoded
      if (encoding !== 'identity') {
        nocompress('already encoded')
        return
      }

      // head
      if (req.method === 'HEAD') {
        nocompress('HEAD request')
        return
      }

      // compression method
      // Get all client-accepted encodings, then pick the first one from our preferred order
      const negotiator = new Negotiator(req)
      const clientEncodings = negotiator.encodings(SUPPORTED_ENCODING) as string[]
      // Prefer server's order, but fall back to client's first choice if no preferred match
      let method: string | undefined =
        PREFERRED_ENCODING.find(enc => clientEncodings.includes(enc)) || clientEncodings[0]

      // if no method is found, use the default encoding
      if (!req.headers['accept-encoding'] && encodingSupported.has(enforceEncoding)) {
        method = enforceEncoding
      }

      // negotiation failed
      if (!method || method === 'identity') {
        nocompress('not acceptable')
        return
      }

      // compression stream
      if (method === 'zstd') {
        stream = zlib.createZstdCompress(optsZstd)
      } else if (method === 'br') {
        stream = zlib.createBrotliCompress(optsBrotli)
      } else if (method === 'gzip') {
        stream = zlib.createGzip(zlibOpts)
      } else {
        stream = zlib.createDeflate(zlibOpts)
      }

      // add buffered listeners to stream
      addListeners(stream, stream.on.bind(stream), listeners!)

      // header fields
      res.setHeader('Content-Encoding', method)
      res.removeHeader('Content-Length')

      // compression
      stream.on('data', function onStreamData(chunk: Buffer) {
        if (!_write.call(res, chunk, 'utf8', () => {})) {
          stream?.pause()
        }
      })

      stream.on('end', function onStreamEnd() {
        _end.call(res, undefined, 'utf8', () => {})
      })

      _on.call(res, 'drain', function onResponseDrain() {
        stream?.resume()
      })
    })

    next()
  }
}

/**
 * Default filter function.
 * Returns true if the Content-Type is compressible.
 */
export function shouldCompress(_req: any, res: any): boolean {
  const type = res.getHeader('Content-Type') as string | undefined

  if (type === undefined || !compressible(type)) {
    return false
  }

  return true
}

function addListeners(
  stream: any,
  on: (type: string, listener: (...args: any[]) => void) => void,
  listeners: [string, (...args: any[]) => void][],
): void {
  for (const [type, listener] of listeners) {
    on.call(stream, type, listener)
  }
}

function chunkLength(chunk: any, encoding?: BufferEncoding): number {
  if (!chunk) {
    return 0
  }

  return Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding)
}

function shouldTransform(_req: any, res: any): boolean {
  const cacheControl = res.getHeader('Cache-Control') as string | undefined

  // Don't compress for Cache-Control: no-transform
  // https://tools.ietf.org/html/rfc7234#section-5.2.2.4
  return !cacheControl || !cacheControlNoTransformRegExp.test(cacheControl)
}

function toBuffer(chunk: any, encoding?: BufferEncoding): Buffer {
  return Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding)
}

function headersSent(res: any): boolean {
  return typeof res.headersSent !== 'boolean' ? Boolean(res._header) : res.headersSent
}

function parseBytes(value: string | number | undefined): number | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'number') return value

  const match = /^(\d+(?:\.\d+)?)\s*(kb|mb|gb|tb|b)?$/i.exec(value)
  if (!match) return undefined

  const n = Number.parseFloat(match[1]!)
  const unit = (match[2] || 'b').toLowerCase()

  const unitMap: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 ** 2,
    gb: 1024 ** 3,
    tb: 1024 ** 4,
  }

  return Math.floor(n * unitMap[unit]!)
}
