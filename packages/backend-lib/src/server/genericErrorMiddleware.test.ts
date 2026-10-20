import type { BackendErrorResponseObject } from '@naturalcycles/js-lib/error'
import { AppError } from '@naturalcycles/js-lib/error'
import type { FetcherResponse } from '@naturalcycles/js-lib/http'
import { pDelay } from '@naturalcycles/js-lib/promise/pDelay.js'
import { afterAll, expect, test } from 'vitest'
import { getDefaultRouter } from '../express/getDefaultRouter.js'
import { debugResource } from '../test/debug.resource.js'
import { expressTestService } from '../testing/index.js'

const app = await expressTestService.createAppFromResource(debugResource)

// Errors that reach the middleware without backendResponseStatusCode
const router = getDefaultRouter()

router.post('/echo', (req, res) => {
  res.json(req.body)
})

router.post('/plainError', () => {
  throw new Error('plain')
})

router.post('/gatewayError', () => {
  // e.g a payment gateway client error: `statusCode` and `headers` are the gateway's response, not ours
  throw Object.assign(new Error('gateway said no'), {
    statusCode: 402,
    headers: { 'request-id': 'req_123' },
  })
})

router.post('/httpError5xx', () => {
  throw Object.assign(new Error('stream is not readable'), {
    status: 500,
    statusCode: 500,
    expose: false,
    type: 'stream.not.readable',
  })
})

router.post('/httpError502', () => {
  throw Object.assign(new Error('bad gateway'), { status: 502, statusCode: 502, expose: false })
})

router.post('/httpErrorWithHeaders', () => {
  throw Object.assign(new Error('method not allowed'), {
    status: 405,
    statusCode: 405,
    expose: true,
    headers: { Allow: 'GET, HEAD' },
  })
})

router.post('/appErrorWins', () => {
  throw Object.assign(new AppError('conflict', { backendResponseStatusCode: 409 }), {
    status: 400,
    statusCode: 400,
    expose: true,
  })
})

router.post('/staleHeaders', (_req, res) => {
  res.set({
    'Cache-Control': 'private, max-age=3600',
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="report.pdf"',
    'Content-Language': 'en',
    ETag: '"abc"',
    'Last-Modified': 'Tue, 20 Oct 2026 00:00:00 GMT',
    'Retry-After': '30',
  })
  throw new AppError('generation failed', { backendResponseStatusCode: 409 })
})

router.post('/errorMidStream', async (_req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.write('[')
  await pDelay(10)
  throw new Error('stream broke')
})

router.post('/errorAfterResponse', (_req, res) => {
  res.json({ ok: 1 })
  throw new Error('too late')
})

const appWithRouter = await expressTestService.createAppFromResource(router, undefined, {
  bodyParserJsonOptions: { limit: '1kb' },
})

afterAll(async () => {
  await app.close()
  await appWithRouter.close()
})

async function post(
  url: string,
  body: string,
  contentType = 'application/json',
): Promise<FetcherResponse<BackendErrorResponseObject>> {
  return await appWithRouter.doFetch<BackendErrorResponseObject>({
    url,
    method: 'POST',
    body,
    headers: { 'content-type': contentType },
    throwHttpErrors: false,
  })
}

test('genericErrorFormatter', async () => {
  let res = await app.get<BackendErrorResponseObject>('asyncError', {
    throwHttpErrors: false,
  })

  expect(res.error.data['dirtySecret']).toBe('51')

  const overriddenSecret = 'Nothing to see'

  const appWExtraMw = await expressTestService.createAppFromResource(debugResource, undefined, {
    genericErrorMwCfg: {
      formatError: err => {
        err.data['dirtySecret'] = overriddenSecret
      },
    },
  })
  res = await appWExtraMw.get<BackendErrorResponseObject>('asyncError', {
    throwHttpErrors: false,
  })

  expect(res.error.data['dirtySecret']).toEqual(overriddenSecret)
  await appWExtraMw.close()
})

test('should respond with 400 when the json body is malformed', async () => {
  const res = await post('echo', '{"email": "a@b.c')

  expect(res.statusCode).toBe(400)
  expect(res.body!.error.data.backendResponseStatusCode).toBe(400)
  expect(res.body!.error.message).toContain('JSON')
})

test('should respond with 413 when the body exceeds the limit', async () => {
  const res = await post('echo', JSON.stringify({ padding: 'x'.repeat(2000) }))

  expect(res.statusCode).toBe(413)
  expect(res.body!.error.message).toBe('request entity too large')
})

test('should respond with 415 when the charset is unsupported', async () => {
  const res = await post('echo', '{}', 'application/json; charset=koi8-r')

  expect(res.statusCode).toBe(415)
  expect(res.body!.error.message).toBe('unsupported charset "KOI8-R"')
})

test('should still parse a well-formed json body', async () => {
  const res = await post('echo', '{"email": "a@b.c"}')

  expect(res.statusCode).toBe(200)
  expect(res.body).toEqual({ email: 'a@b.c' })
})

test('should keep the status of a 5xx http-error', async () => {
  const res500 = await post('httpError5xx', '{}')
  const res502 = await post('httpError502', '{}')

  expect(res500.statusCode).toBe(500)
  expect(res502.statusCode).toBe(502)
  expect(res502.body!.error.data.backendResponseStatusCode).toBe(502)
})

test('should default to 500 for an error without a status', async () => {
  const res = await post('plainError', '{}')

  expect(res.statusCode).toBe(500)
  expect(res.body!.error.data.backendResponseStatusCode).toBe(500)
})

test('should ignore statusCode and headers that are not accompanied by the http-errors marker', async () => {
  const res = await post('gatewayError', '{}')

  expect(res.statusCode).toBe(500)
  expect(res.fetchResponse!.headers.get('request-id')).toBeNull()
})

test('should prefer an explicit backendResponseStatusCode over http-errors fields', async () => {
  const res = await post('appErrorWins', '{}')

  expect(res.statusCode).toBe(409)
})

test('should set the headers an http-error carries', async () => {
  const res = await post('httpErrorWithHeaders', '{}')

  expect(res.statusCode).toBe(405)
  expect(res.fetchResponse!.headers.get('allow')).toBe('GET, HEAD')
})

test('should drop headers set for the response that was never sent and forbid caching', async () => {
  const res = await post('staleHeaders', '{}')
  const { headers } = res.fetchResponse!

  expect(res.statusCode).toBe(409)
  expect(headers.get('content-type')).toBe('application/json; charset=utf-8')
  expect(headers.get('cache-control')).toBe('no-store')
  expect(headers.get('content-disposition')).toBeNull()
  expect(headers.get('content-language')).toBeNull()
  expect(headers.get('last-modified')).toBeNull()
  expect(headers.get('etag')).not.toBe('"abc"')
  // headers unrelated to the body survive
  expect(headers.get('retry-after')).toBe('30')
})

test('should cut the connection when the error happens mid-stream', async () => {
  const response = await globalThis.fetch(`${appWithRouter.cfg.baseUrl}/errorMidStream`, {
    method: 'POST',
  })

  // headers were already on the wire when the handler threw
  expect(response.status).toBe(200)
  // the body never completes, the client gets a failed transfer instead of a hang
  await expect(response.text()).rejects.toThrow('terminated')
})

test('should leave a completed response alone when the error comes after it', async () => {
  const res = await post('errorAfterResponse', '{}')

  expect(res.statusCode).toBe(200)
  expect(res.body).toEqual({ ok: 1 })
})
