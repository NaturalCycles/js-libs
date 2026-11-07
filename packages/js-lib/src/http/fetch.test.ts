import { afterEach, expect, it, vi } from 'vitest'
import { pExpectedError } from '../error/try.js'
import type { FetchError } from './fetch.js'
import { _fetch } from './fetch.js'

const url = 'https://example.com/api'

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it('should return the parsed json', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ ok: 1 }))

  expect(await _fetch(url)).toEqual({ ok: 1 })
  expect(fetchSpy).toHaveBeenCalledExactlyOnceWith(url, {
    method: 'GET',
    signal: expect.any(AbortSignal),
  })
})

it('should return {} on empty body, and pass no signal when timeout is disabled', async () => {
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(null, { status: 204 }))

  expect(await _fetch(url, { method: 'DELETE', timeout: 0 })).toEqual({})
  expect(fetchSpy.mock.calls[0]![1]).toMatchObject({ method: 'DELETE', signal: undefined })
})

it('should pass the picked RequestInit options through', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}))

  const init = {
    method: 'PUT',
    body: 'raw',
    cache: 'no-store',
    credentials: 'include',
    keepalive: true,
  } as const
  await _fetch(url, init)
  expect(fetchSpy.mock.calls[0]![1]).toMatchObject(init)
})

it('should send the json body with content-type and custom headers', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ id: 1 }))

  expect(
    await _fetch(url, { method: 'POST', json: { a: 1 }, headers: { authorization: 'x' } }),
  ).toEqual({ id: 1 })
  expect(fetchSpy.mock.calls[0]![1]).toMatchObject({
    method: 'POST',
    body: '{"a":1}',
    headers: { 'content-type': 'application/json', authorization: 'x' },
  })
})

it('should throw a FetchError on 4xx without retrying, with the body text as cause', async () => {
  const bodyText =
    '{"error":{"name":"AppError","message":"scope","data":{"code":"INSUFFICIENT_SCOPE"}}}'
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(bodyText, { status: 403 }))

  const err = await pExpectedError<FetchError>(_fetch(url))
  expect(err).toBeInstanceOf(Error)
  expect(err.name).toBe('Error')
  expect(err.message).toBe('403 GET https://example.com/api')
  expect(err.cause).toBe(bodyText)
  expect(err.data).toEqual({
    responseStatusCode: 403,
    requestUrl: url,
    requestMethod: 'GET',
  })
  expect(fetchSpy).toHaveBeenCalledTimes(1)
})

it('should retry 5xx twice with 1s and 2s back-off, then throw', async () => {
  vi.useFakeTimers()
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => new Response('oops', { status: 503 }))

  const promise = pExpectedError<FetchError>(_fetch(url))
  await expectCallsAfter(fetchSpy, 999, 1)
  await expectCallsAfter(fetchSpy, 1, 2)
  await expectCallsAfter(fetchSpy, 1999, 2)
  await expectCallsAfter(fetchSpy, 1, 3)

  const err = await promise
  expect(err.message).toBe('503 GET https://example.com/api')
  expect(err.data.responseStatusCode).toBe(503)
  expect(err.cause).toBe('oops')
})

it('should retry 429 and 408, and return the eventual response', async () => {
  vi.useFakeTimers()
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(new Response(null, { status: 429 }))
    .mockResolvedValueOnce(new Response(null, { status: 408 }))
    .mockResolvedValueOnce(Response.json({ ok: 1 }))

  const promise = _fetch(url)
  await expectCallsAfter(fetchSpy, 1000, 2)
  await expectCallsAfter(fetchSpy, 2000, 3)
  expect(await promise).toEqual({ ok: 1 })
})

it('should retry a network error and return the eventual response', async () => {
  vi.useFakeTimers()
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockRejectedValueOnce(new TypeError('fetch failed'))
    .mockResolvedValueOnce(Response.json({ ok: 1 }))

  const promise = _fetch(url)
  await expectCallsAfter(fetchSpy, 1000, 2)
  expect(await promise).toEqual({ ok: 1 })
})

it('should not retry a POST, and keep the network error as cause', async () => {
  const networkError = new TypeError('fetch failed')
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(networkError)

  const err = await pExpectedError<FetchError>(_fetch(url, { method: 'POST' }))
  expect(err.message).toBe('POST https://example.com/api')
  expect(err.data.responseStatusCode).toBe(0)
  expect(err.cause).toBe(networkError)
  expect(fetchSpy).toHaveBeenCalledTimes(1)
})

it('should not retry a POST on 5xx', async () => {
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(null, { status: 500 }))

  const err = await pExpectedError<FetchError>(_fetch(url, { method: 'POST' }))
  expect(err.message).toBe('500 POST https://example.com/api')
  expect(err.cause).toBe('')
  expect(fetchSpy).toHaveBeenCalledTimes(1)
})

it('should time out', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    async (_url, init) =>
      await new Promise((_, reject) => {
        init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason as Error))
      }),
  )

  const err = await pExpectedError<FetchError>(_fetch(url, { method: 'POST', timeout: 10 }))
  expect(err.message).toBe('POST https://example.com/api')
  expect((err.cause as Error).name).toBe('TimeoutError')
})

it('should throw on a 2xx with an unparseable body, without retrying', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html>'))

  const err = await pExpectedError<FetchError>(_fetch(url))
  expect(err.message).toBe('200 GET https://example.com/api')
  expect(err.data.responseStatusCode).toBe(200)
  expect((err.cause as Error).name).toBe('SyntaxError')
  expect(fetchSpy).toHaveBeenCalledTimes(1)
})

async function expectCallsAfter(
  fetchSpy: { mock: { calls: unknown[] } },
  millis: number,
  calls: number,
): Promise<void> {
  await vi.advanceTimersByTimeAsync(millis)
  expect(fetchSpy.mock.calls).toHaveLength(calls)
}
