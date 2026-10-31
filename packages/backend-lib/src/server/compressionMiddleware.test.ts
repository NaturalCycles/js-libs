import zlib from 'node:zlib'
import { pDefer } from '@naturalcycles/js-lib/promise/pDefer.js'
import express from 'express'
import { afterAll, expect, it } from 'vitest'
import { getDefaultRouter } from '../express/getDefaultRouter.js'
import { expressTestService } from '../testing/index.js'
import { compressionMiddleware } from './compressionMiddleware.js'

// Create a resource that returns data large enough to trigger compression (>1024 bytes)
const largeData = { data: 'x'.repeat(2000) }
const router = getDefaultRouter()
router.get('/', async (_req, res) => {
  res.json(largeData)
})

// Multi-chunk body: written in several `res.write` calls, so only the stream path applies
router.get('/multi', async (_req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.write('[')
  res.write(JSON.stringify(largeData))
  res.write(',')
  res.write(JSON.stringify(largeData))
  res.end(']')
})

// `res.end(chunk, callback)` signature: the callback must still be called exactly once
const endCallbackCalls = pDefer<number>()
router.get('/cb', async (_req, res) => {
  res.setHeader('Content-Type', 'application/json')
  let calls = 0
  res.end(JSON.stringify(largeData), () => {
    calls++
    endCallbackCalls.resolve(calls)
  })
})

const app = await expressTestService.createAppFromResource(router)

// Same routes, but with the sync path disabled: everything goes through a zlib stream
const streamedExpressApp = express()
streamedExpressApp.use(compressionMiddleware({ syncMaxBytes: 0 }))
streamedExpressApp.get('/', (_req, res) => {
  res.json(largeData)
})
const streamedApp = await expressTestService.createApp(streamedExpressApp)

afterAll(async () => {
  await app.close()
  await streamedApp.close()
})

// 'gzip, deflate, br, zstd' is the Chrome scenario - gzip listed first but zstd should still be preferred
it.each(['gzip, deflate, br, zstd', 'br, zstd, gzip, deflate'])(
  'should prefer zstd over the other encodings in "%s"',
  async acceptEncoding => {
    const { fetchResponse } = await app.doFetch({
      headers: { 'Accept-Encoding': acceptEncoding },
    })

    expect(fetchResponse?.headers.get('Content-Encoding')).toBe('zstd')
  },
)

it('should use br when zstd is not accepted', async () => {
  const { fetchResponse } = await app.doFetch({
    headers: { 'Accept-Encoding': 'gzip, deflate, br' },
  })

  expect(fetchResponse?.headers.get('Content-Encoding')).toBe('br')
})

it('should use gzip when only gzip is accepted', async () => {
  const { fetchResponse } = await app.doFetch({
    headers: { 'Accept-Encoding': 'gzip' },
  })

  expect(fetchResponse?.headers.get('Content-Encoding')).toBe('gzip')
})

it('should use deflate when only deflate is accepted', async () => {
  const { fetchResponse } = await app.doFetch({
    headers: { 'Accept-Encoding': 'deflate' },
  })

  expect(fetchResponse?.headers.get('Content-Encoding')).toBe('deflate')
})

it('should not compress when response is below threshold', async () => {
  const smallRouter = getDefaultRouter()
  smallRouter.get('/', async (_req, res) => {
    res.json({ ok: 1 }) // Small response, below 1024 byte threshold
  })

  const smallApp = await expressTestService.createAppFromResource(smallRouter)

  try {
    const { fetchResponse } = await smallApp.doFetch({
      headers: { 'Accept-Encoding': 'gzip, deflate, br, zstd' },
    })

    expect(fetchResponse?.headers.get('Content-Encoding')).toBeNull()
    // The response still varies by Accept-Encoding, even though this one was not compressed
    expect(fetchResponse?.headers.get('Vary')).toContain('Accept-Encoding')
    expect(fetchResponse?.headers.get('Content-Length')).toBe(
      String(JSON.stringify({ ok: 1 }).length),
    )
  } finally {
    await smallApp.close()
  }
})

it('should compress a single-chunk body synchronously with an exact Content-Length', async () => {
  for (const [acceptEncoding, encoding, compress] of [
    [
      'zstd',
      'zstd',
      (b: Buffer) =>
        zlib.zstdCompressSync(b, { params: { [zlib.constants.ZSTD_c_compressionLevel]: 1 } }),
    ],
    [
      'br',
      'br',
      (b: Buffer) =>
        zlib.brotliCompressSync(b, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } }),
    ],
    ['gzip', 'gzip', (b: Buffer) => zlib.gzipSync(b)],
  ] as const) {
    const { fetchResponse, body } = await app.doFetch<string>({
      headers: { 'Accept-Encoding': acceptEncoding },
      responseType: 'text',
    })

    expect(fetchResponse?.headers.get('Content-Encoding')).toBe(encoding)
    // Streamed responses are chunked; the sync path knows the compressed size up front
    expect(fetchResponse?.headers.get('Transfer-Encoding')).toBeNull()
    expect(fetchResponse?.headers.get('Content-Length')).toBe(
      String(compress(Buffer.from(body!)).length),
    )
    expect(fetchResponse?.headers.get('Vary')).toContain('Accept-Encoding')
    expect(JSON.parse(body!)).toEqual(largeData)
  }
})

it('should stream a body written in several chunks', async () => {
  const { fetchResponse, body } = await app.doFetch<unknown[]>({
    url: 'multi',
    headers: { 'Accept-Encoding': 'zstd' },
  })

  expect(fetchResponse?.headers.get('Content-Encoding')).toBe('zstd')
  expect(fetchResponse?.headers.get('Content-Length')).toBeNull()
  expect(fetchResponse?.headers.get('Transfer-Encoding')).toBe('chunked')
  expect(body).toEqual([largeData, largeData])
})

it('should stream single-chunk bodies when syncMaxBytes is 0', async () => {
  const { fetchResponse, body } = await streamedApp.doFetch({
    headers: { 'Accept-Encoding': 'zstd' },
  })

  expect(fetchResponse?.headers.get('Content-Encoding')).toBe('zstd')
  expect(fetchResponse?.headers.get('Content-Length')).toBeNull()
  expect(fetchResponse?.headers.get('Transfer-Encoding')).toBe('chunked')
  expect(body).toEqual(largeData)
})

it('should call the res.end callback once', async () => {
  const { fetchResponse, body } = await app.doFetch({
    url: 'cb',
    headers: { 'Accept-Encoding': 'zstd' },
  })

  expect(fetchResponse?.headers.get('Content-Encoding')).toBe('zstd')
  expect(body).toEqual(largeData)
  expect(await endCallbackCalls).toBe(1)
})

it('should not compress a HEAD response', async () => {
  const { fetchResponse } = await app.doFetch({
    method: 'HEAD',
    headers: { 'Accept-Encoding': 'zstd' },
    responseType: 'void',
  })

  expect(fetchResponse?.status).toBe(200)
  expect(fetchResponse?.headers.get('Content-Encoding')).toBeNull()
  expect(fetchResponse?.headers.get('Vary')).toContain('Accept-Encoding')
})
