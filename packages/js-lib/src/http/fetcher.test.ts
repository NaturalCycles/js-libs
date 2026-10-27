import { afterEach, expect, expectTypeOf, it, vi } from 'vitest'
import { localTime } from '../datetime/index.js'
import {
  _assert,
  _assertIsBackendErrorResponseObject,
  _assertIsError,
  _assertIsErrorObject,
} from '../error/assert.js'
import type { BackendErrorResponseObject, ErrorObject } from '../error/error.model.js'
import {
  _errorLikeToErrorObject,
  AppError,
  HttpRequestError,
  UnexpectedPassError,
} from '../error/error.util.js'
import { pExpectedErrorString } from '../error/index.js'
import { commonLoggerNoop, consoleLogger } from '../log/commonLogger.js'
import { _omit } from '../object/object.util.js'
import { _stringify } from '../string/stringify.js'
import type { UnixTimestampMillis } from '../types.js'
import { Fetcher, getFetcher } from './fetcher.js'
import type { FetcherCfg, FetcherOptions, FetcherRequest } from './fetcher.model.js'

afterEach(() => {
  vi.useRealTimers()
})

it('should apply the default config and request options', () => {
  const fetcher = getFetcher()
  expect(_omit(fetcher.cfg, ['logger'])).toMatchInlineSnapshot(`
    {
      "baseUrl": "",
      "debug": false,
      "errorData": {},
      "hooks": {},
      "init": {
        "credentials": undefined,
        "dispatcher": undefined,
        "headers": {
          "user-agent": "fetcher/5",
        },
        "keepalive": undefined,
        "method": "GET",
        "redirect": undefined,
      },
      "inputUrl": "",
      "logRequest": false,
      "logRequestBody": false,
      "logResponse": false,
      "logResponseBody": false,
      "logWithBaseUrl": true,
      "logWithSearchParams": true,
      "name": undefined,
      "responseType": "json",
      "retry": {
        "count": 2,
        "maxRetryAfter": 600000,
        "timeout": 1000,
        "timeoutMax": 30000,
        "timeoutMultiplier": 2,
      },
      "retry3xx": false,
      "retry4xx": false,
      "retry5xx": true,
      "retryPost": false,
      "searchParams": {},
      "throwHttpErrors": true,
      "timeoutSeconds": 30,
    }
  `)

  expect(fetcher.cfg.logger).toBe(consoleLogger)

  const req: FetcherRequest = (fetcher as any).normalizeOptions({ url: 'some', logResponse: true })
  expect(req.logResponse).toBe(true)
  req.started = 1234 as UnixTimestampMillis

  expect(req).toMatchInlineSnapshot(`
    {
      "debug": false,
      "errorData": {},
      "fullUrl": "some",
      "init": {
        "credentials": undefined,
        "dispatcher": undefined,
        "headers": {
          "accept": "application/json",
          "user-agent": "fetcher/5",
        },
        "keepalive": undefined,
        "method": "GET",
        "redirect": "follow",
      },
      "inputUrl": "some",
      "logRequest": false,
      "logRequestBody": false,
      "logResponse": true,
      "logResponseBody": false,
      "responseType": "json",
      "retry": {
        "count": 2,
        "maxRetryAfter": 600000,
        "timeout": 1000,
        "timeoutMax": 30000,
        "timeoutMultiplier": 2,
      },
      "retry3xx": false,
      "retry4xx": false,
      "retry5xx": true,
      "retryPost": false,
      "started": 1234,
      "throwHttpErrors": true,
      "timeoutSeconds": 30,
      "url": "some",
    }
  `)
})

it('should not mutate console', () => {
  const consoleSpy = vi.spyOn(console, 'log')
  const logger = commonLoggerNoop

  const fetcher = getNonRetryFetcher({
    logger,
  })
  expect(fetcher.cfg.logger).toBe(logger)

  // When bug existed on fetcher - it mutated console.log to the logger.log
  // So, it'll be called 0 times
  // Here we're expecting that it's called 1 time
  console.log('yo')
  expect(consoleSpy).toHaveBeenCalledTimes(1)
})

it('should return an HttpRequestError with the backend error as cause on a 500 response', async () => {
  const fetcher = getNonRetryFetcher({
    logResponse: true,
  })
  expect(fetcher.cfg.logResponse).toBe(true)
  vi.spyOn(Fetcher, 'callNativeFetch').mockImplementation(async () => {
    return Response.json(
      {
        error: _errorLikeToErrorObject(
          new AppError('aya-baya', {
            some: 'key',
          }),
        ),
      } satisfies BackendErrorResponseObject,
      {
        status: 500,
      },
    )
  })

  const { err, body } = await fetcher.doFetch({ url: 'some' })
  expect(body).toBeDefined()
  _assertIsBackendErrorResponseObject(body)
  expect(_stringify(body.error, { includeErrorData: true })).toMatchInlineSnapshot(`
"AppError: aya-baya
{
  "some": "key"
}"
`)

  _assertIsError(err, HttpRequestError)

  // This is how "default tooling" prints errors
  expect(String(err)).toMatchInlineSnapshot(`"HttpRequestError: 500 GET some"`)

  // This is how Jest prints errors
  expect(err).toMatchInlineSnapshot('[HttpRequestError: 500 GET some]')

  // This is how NC-ecosystem-aware consumer prints errors (e.g with Cause)
  expect(_stringify(err)).toMatchInlineSnapshot(`
    "HttpRequestError: 500 GET some
    Caused by: AppError: aya-baya"
  `)
  err.data.requestDuration = 10 // mock stability
  expect(err.data).toMatchInlineSnapshot(`
    {
      "requestDuration": 10,
      "requestMethod": "GET",
      "requestSignature": "GET some",
      "requestUrl": "some",
      "responseStatusCode": 500,
    }
  `)

  _assertIsErrorObject(err.cause)
  delete err.cause.stack
  expect(err.cause).toMatchInlineSnapshot(`
    {
      "data": {
        "some": "key",
      },
      "message": "aya-baya",
      "name": "AppError",
    }
  `)
  expect(_stringify(err.cause)).toMatchInlineSnapshot(`"AppError: aya-baya"`)
  const { response } = err.data
  _assert(response, 'response should exist')
  expect(response.ok).toBe(false)
  expect(response.url).toMatchInlineSnapshot(`""`) // unclear why
  expect(response.status).toBe(500)
  expect(Object.fromEntries(response.headers)).toMatchInlineSnapshot(`
    {
      "content-type": "application/json",
    }
  `)
  expect(Object.getOwnPropertyDescriptor(err.data, 'response')).toMatchObject({
    configurable: true,
    writable: true,
    enumerable: false,
  })
})

it('should use the configured fetchFn', async () => {
  const fetcher = getNonRetryFetcher({
    fetchFn: async (url, _init) => {
      return Response.json({ url })
    },
  })

  const url = 'abc'
  const r = await fetcher.get(url)
  expect(r).toEqual({ url })
})

it('should return the error body instead of throwing when throwHttpErrors is false', async () => {
  const fetcher = getNonRetryFetcher({
    throwHttpErrors: false,
  })

  const error: ErrorObject = {
    name: 'AppError',
    message: 'some',
    data: {},
  }

  vi.spyOn(Fetcher, 'callNativeFetch').mockResolvedValue(
    Response.json(
      {
        error,
      } satisfies BackendErrorResponseObject,
      { status: 500 },
    ),
  )

  const r = await fetcher.get('')
  expect(r).toEqual({ error })
})

it('should fail with a JsonParseError cause when the body is not JSON', async () => {
  const fetcher = getNonRetryFetcher()
  vi.spyOn(Fetcher, 'callNativeFetch').mockResolvedValue(new Response('some text'))

  const { err } = await fetcher.doFetch({
    url: 'some',
  })
  _assertIsError(err)
  expect(String(err)).toMatchInlineSnapshot(`"HttpRequestError: GET some"`)
  _assertIsErrorObject(err.cause)
  delete err.cause.stack
  expect(err.cause).toMatchInlineSnapshot(`
    {
      "data": {
        "text": "some text",
      },
      "message": "Failed to parse: some text",
      "name": "JsonParseError",
    }
  `)

  expect(_stringify(err)).toMatchInlineSnapshot(`
    "HttpRequestError: GET some
    Caused by: JsonParseError: Failed to parse: some text"
  `)
})

it('should append searchParams from the config and the request to the url', async () => {
  const urls: string[] = []
  vi.spyOn(Fetcher, 'callNativeFetch').mockImplementation(async url => {
    urls.push(url)
    return Response.json({ ok: 1 })
  })
  const fetcher = getNonRetryFetcher({ searchParams: { key: 'k' } })

  await fetcher.get('https://a.com/items?sort=asc', {
    searchParams: { page: 2, q: 'a b', skip: undefined },
  })

  expect(urls).toEqual(['https://a.com/items?sort=asc&key=k&page=2&q=a+b'])
})

it('should retry a 429 after its retry-after delay and return the final response', async () => {
  vi.useFakeTimers()
  const fetcher = getFetcher({
    debug: true,
  })

  const badResponse = (): Response =>
    new Response('429 rate limited', {
      status: 429,
      headers: {
        'retry-after': '2',
      },
    })
  vi.spyOn(Fetcher, 'callNativeFetch')
    .mockResolvedValueOnce(badResponse())
    .mockResolvedValueOnce(badResponse())
    .mockResolvedValueOnce(new Response('ok'))

  const promise = fetcher.getText('')
  await expectCallsAfter(1999, 1)
  await expectCallsAfter(2, 2)
  await expectCallsAfter(1998, 2)
  await expectCallsAfter(2, 3)
  const r = await promise
  expect(r).toBe('ok')
})

it('should retry a 429 at its retry-after date and return the final response', async () => {
  // A whole second, since the retry-after date has second precision
  vi.useFakeTimers({ now: new Date('2024-06-21T00:00:00Z') })
  const fetcher = getFetcher({
    debug: true,
  })

  const badResponse = (): Response =>
    new Response('429 rate limited', {
      status: 429,
      headers: {
        'retry-after': localTime.now().plus(2, 'second').toDate().toString(),
      },
    })

  vi.spyOn(Fetcher, 'callNativeFetch')
    .mockImplementationOnce(async () => badResponse())
    .mockImplementationOnce(async () => badResponse())
    .mockResolvedValueOnce(new Response('ok'))

  const promise = fetcher.getText('')
  await expectCallsAfter(1999, 1)
  await expectCallsAfter(2, 2)
  await expectCallsAfter(1998, 2)
  await expectCallsAfter(2, 3)
  const r = await promise
  expect(r).toBe('ok')
})

it('should return [error, null] on failure and [null, data] on success from tryFetch', async () => {
  vi.spyOn(Fetcher, 'callNativeFetch').mockResolvedValue(
    new Response('bad', {
      status: 500,
    }),
  )

  const [err, data] = await getNonRetryFetcher().tryFetch<{ ok: boolean }>({
    url: 'https://example.com',
    method: 'POST',
  })
  expectTypeOf(err).toEqualTypeOf<HttpRequestError | null>()
  expectTypeOf(data).toEqualTypeOf<{ ok: boolean } | null>()
  expect(err).toBeInstanceOf(HttpRequestError)
  expect(data).toBeNull()

  if (err) {
    expectTypeOf(err).toEqualTypeOf<HttpRequestError>()
    expect(err.data.requestMethod).toBe('POST')
    expect(_stringify(err)).toMatchInlineSnapshot(`
      "HttpRequestError: 500 POST https://example.com/
      Caused by: Error: bad"
    `)
  } else {
    expectTypeOf(data).toEqualTypeOf<{ ok: boolean }>()
  }

  vi.spyOn(Fetcher, 'callNativeFetch').mockResolvedValue(Response.json({ ok: true }))

  const [err2, data2] = await getFetcher().tryFetch<{ ok: boolean }>({ url: 'https://example.com' })
  expect(err2).toBeNull()
  if (err2) {
    expectTypeOf(err2).toEqualTypeOf<HttpRequestError>()
  } else {
    expectTypeOf(data2).toEqualTypeOf<{ ok: boolean }>()
    expect(data2).toEqual({ ok: true })
  }
})

it('should not leak per-request headers into later requests', async () => {
  const a: any[] = []
  vi.spyOn(Fetcher, 'callNativeFetch').mockImplementation(async (_url, init) => {
    a.push(init.headers)
    return Response.json({ ok: 1 })
  })

  const fetcher = getNonRetryFetcher()
  const headers = { a: 'a' }

  await fetcher.doFetch({
    url: 'https://example.com',
    headers,
  })

  await fetcher.doFetch({
    url: 'https://example.com',
  })

  expect(a).toHaveLength(2)
  expect(a[0]).toMatchInlineSnapshot(`
    {
      "a": "a",
      "accept": "application/json",
      "user-agent": "fetcher/5",
    }
  `)
  expect(a[1]).toMatchInlineSnapshot(`
    {
      "accept": "application/json",
      "user-agent": "fetcher/5",
    }
  `)
  expect(a[0]).not.toBe(a[1])
  expect(headers).toEqual({ a: 'a' })
})

it('should expose the response headers on fetchResponse', async () => {
  const fetcher = getNonRetryFetcher()

  vi.spyOn(Fetcher, 'callNativeFetch').mockResolvedValue(Response.json({ ok: 1 }))

  const { fetchResponse } = await fetcher.doFetch({})
  expect(Object.fromEntries(fetchResponse!.headers)).toMatchInlineSnapshot(`
    {
      "content-type": "application/json",
    }
  `)
})

it('should return the error from expectError, throwing UnexpectedPassError on success', async () => {
  const fetcher = getNonRetryFetcher()

  // 1. Error should pass
  mockFetcherWithError()

  const err = await fetcher.expectError({ url: 'someUrl' })
  expect(_stringify(err)).toMatchInlineSnapshot(`
    "HttpRequestError: 500 GET someUrl
    Caused by: AppError: some"
  `)

  // 2. Pass should throw
  vi.spyOn(Fetcher, 'callNativeFetch').mockResolvedValue(Response.json({ ok: true }))

  expect(
    await pExpectedErrorString(
      fetcher.expectError({
        url: 'some',
      }),
      UnexpectedPassError,
    ),
  ).toMatchInlineSnapshot(`"UnexpectedPassError: Fetch was expected to error"`)
})

function mockFetcherWithError(): void {
  vi.spyOn(Fetcher, 'callNativeFetch').mockResolvedValue(
    Response.json(
      {
        error: {
          name: 'AppError',
          message: 'some',
          data: {},
        },
      } satisfies BackendErrorResponseObject,
      { status: 500 },
    ),
  )
}

function getNonRetryFetcher(opt?: FetcherCfg & FetcherOptions): Fetcher {
  return getFetcher({
    ...opt,
    retry: {
      count: 0,
    },
  })
}

async function expectCallsAfter(millis: number, calls: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(millis)
  expect(Fetcher.callNativeFetch).toHaveBeenCalledTimes(calls)
}

it('should let the onError hook modify the error', async () => {
  mockFetcherWithError()
  const fetcher = getNonRetryFetcher()

  const err = await fetcher.expectError({
    url: 'someUrl',
    onError: err => {
      ;(err as any).yo = 'yo'
      ;(err as AppError).data['aa'] = 'aa'
    },
  })
  expect((err as any)['yo']).toBe('yo')
  expect(err.data['aa']).toBe('aa')
})

it('should add errorData to the error data', async () => {
  mockFetcherWithError()
  const fetcher = getNonRetryFetcher()

  const err = await fetcher.expectError({
    url: 'someUrl',
    errorData: {
      b: 'bb',
    },
  })
  expect(err.data['b']).toBe('bb')
})

it('should allow to change user-agent', async () => {
  let headers: any
  vi.spyOn(Fetcher, 'callNativeFetch').mockImplementation(async (_url, init) => {
    headers = init.headers
    return Response.json({ ok: 1 })
  })
  const fetcher = getNonRetryFetcher()
  const backup = Fetcher.userAgent
  Fetcher.userAgent = 'abcd'

  await fetcher.doFetch({
    url: 'https://example.com',
  })

  expect(headers['user-agent']).toBe('abcd')

  Fetcher.userAgent = backup
})

it('should set the base url, fetcher name and request name in the error data', async () => {
  mockFetcherWithError()

  // Bare fetcher: no name, no baseUrl
  let fetcher = getNonRetryFetcher()
  let err = await fetcher.expectError({ url: 'someUrl' })
  err.data.requestDuration = 10
  expect(err.data.requestBaseUrl).toBeUndefined()
  expect(err.data.fetcherName).toBeUndefined()
  expect(err.data.requestName).toBeUndefined()
  expect(err.data).toMatchInlineSnapshot(`
    {
      "requestDuration": 10,
      "requestMethod": "GET",
      "requestSignature": "GET someUrl",
      "requestUrl": "someUrl",
      "responseStatusCode": 500,
    }
  `)

  // Fetcher with baseUrl
  const baseUrl = 'https://evil.com:8081/api/v3'
  fetcher = getNonRetryFetcher({
    baseUrl,
  })
  err = await fetcher.expectError({ url: 'someUrl' })
  expect(err.data.requestBaseUrl).toBe(baseUrl)
  expect(err.data.fetcherName).toBe('evil.com')

  // Fetcher with name
  const name = 'fancyFetcher'
  fetcher = getNonRetryFetcher({
    name,
  })
  err = await fetcher.expectError({ url: 'someUrl' })
  expect(err.data.requestBaseUrl).toBeUndefined()
  expect(err.data.fetcherName).toBe(name)

  // Fetcher with baseUrl and name
  fetcher = getNonRetryFetcher({
    baseUrl,
    name,
  })
  err = await fetcher.expectError({ url: 'someUrl' })
  expect(err.data.requestBaseUrl).toBe(baseUrl)
  expect(err.data.fetcherName).toBe(name)

  // Fetcher with requestName
  const requestName = 'fancyRequest'
  fetcher = getNonRetryFetcher()
  err = await fetcher.expectError({ url: 'someUrl', requestName })
  expect(err.data.requestName).toBe(requestName)
})

it('should fail with a TimeoutError cause when the request times out', async () => {
  const fetcher = getNonRetryFetcher({
    timeoutSeconds: 0.05,
  })

  // Mock fetch to hang forever (never resolve)
  vi.spyOn(Fetcher, 'callNativeFetch').mockImplementation(
    async (_url, init) =>
      new Promise((_resolve, reject) => {
        // Listen for abort signal to reject like real fetch does
        init.signal?.addEventListener('abort', () => {
          // oxlint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(init.signal!.reason)
        })
      }),
  )

  const { err } = await fetcher.doFetch({ url: 'https://example.com' })
  _assertIsError(err, HttpRequestError)
  expect(err.cause).toBeDefined()
  _assertIsErrorObject(err.cause)
  // AbortSignal.timeout() produces a standard DOMException with name "TimeoutError"
  expect(err.cause.name).toBe('TimeoutError')
})

it('should fail with an AbortError cause when the caller aborts the signal', async () => {
  const fetcher = getNonRetryFetcher()
  const controller = new AbortController()

  vi.spyOn(Fetcher, 'callNativeFetch').mockImplementation(
    async (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          // oxlint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(init.signal!.reason)
        })
      }),
  )

  // Abort after 10ms
  setTimeout(() => controller.abort(), 10)

  const { err } = await fetcher.doFetch({ url: 'https://example.com', signal: controller.signal })
  _assertIsError(err)
  _assertIsErrorObject(err.cause)
  expect(err.cause.name).toBe('AbortError')
})

it('should fail with the AbortError of the caller when it aborts before a long timeout', async () => {
  const fetcher = getNonRetryFetcher({
    timeoutSeconds: 10, // long timeout
  })
  const controller = new AbortController()

  vi.spyOn(Fetcher, 'callNativeFetch').mockImplementation(
    async (_url, init) =>
      new Promise((_resolve, reject) => {
        const { signal } = init
        // oxlint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        if (signal?.aborted) return reject(signal.reason)
        signal?.addEventListener('abort', () => {
          // oxlint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(signal.reason)
        })
      }),
  )

  // Caller aborts immediately - should win over the 10s timeout
  controller.abort(new DOMException('user cancelled', 'AbortError'))

  const { err } = await fetcher.doFetch({ url: 'https://example.com', signal: controller.signal })
  _assertIsError(err)
  _assertIsErrorObject(err.cause)
  expect(err.cause.name).toBe('AbortError')
  expect(err.cause.message).toContain('user cancelled')
})

it('should fail with a TimeoutError cause when the timeout fires before the caller aborts', async () => {
  const fetcher = getNonRetryFetcher({
    timeoutSeconds: 0.05,
  })
  const controller = new AbortController()

  vi.spyOn(Fetcher, 'callNativeFetch').mockImplementation(
    async (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          // oxlint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(init.signal!.reason)
        })
      }),
  )

  const abortTimer = setTimeout(() => controller.abort(), 500)

  const { err } = await fetcher.doFetch({ url: 'https://example.com', signal: controller.signal })
  clearTimeout(abortTimer)
  _assertIsError(err)
  _assertIsErrorObject(err.cause)
  expect(err.cause.name).toBe('TimeoutError')
  expect(controller.signal.aborted).toBe(false)
})

it('should fail with the AbortError of the caller when no timeout is set', async () => {
  const fetcher = getNonRetryFetcher({
    timeoutSeconds: 0,
  })
  const controller = new AbortController()

  vi.spyOn(Fetcher, 'callNativeFetch').mockImplementation(
    async (_url, init) =>
      new Promise((_resolve, reject) => {
        const { signal } = init
        // oxlint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        if (signal?.aborted) return reject(signal.reason)
        signal?.addEventListener('abort', () => {
          // oxlint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(signal.reason)
        })
      }),
  )

  controller.abort(new DOMException('cancelled', 'AbortError'))

  const { err } = await fetcher.doFetch({ url: 'https://example.com', signal: controller.signal })
  _assertIsError(err)
  _assertIsErrorObject(err.cause)
  expect(err.cause.name).toBe('AbortError')
})

it('should not retry after the caller aborts', async () => {
  const fetchSpy = vi.spyOn(Fetcher, 'callNativeFetch')
  let callCount = 0

  fetchSpy.mockImplementation(
    async (_url, init) =>
      new Promise((_resolve, reject) => {
        callCount++
        const { signal } = init
        // oxlint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        if (signal?.aborted) return reject(signal.reason)
        signal?.addEventListener('abort', () => {
          // oxlint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(signal.reason)
        })
      }),
  )

  const controller = new AbortController()
  // Abort after 10ms
  setTimeout(() => controller.abort(), 10)

  const fetcher = getFetcher()
  const { err } = await fetcher.doFetch({ url: 'https://example.com', signal: controller.signal })
  _assertIsError(err)
  expect(callCount).toBe(1)
})

it('should retry 3xx responses when retry3xx is set in the config', async () => {
  const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
  let attempts = 0
  const fetcher = getFetcher({
    logger: commonLoggerNoop,
    retry3xx: true,
    retry: { count: 1, timeout: 1 },
    fetchFn: async () => {
      attempts++
      return new Response('', { status: 302 })
    },
  })

  await fetcher.doFetch({ url: 'someUrl', redirect: 'manual' })
  expect(attempts).toBe(2)
  randomSpy.mockRestore()
})

it('should retry and then return the error body when throwHttpErrors is false', async () => {
  const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
  let attempts = 0
  const fetcher = getFetcher({
    logger: commonLoggerNoop,
    throwHttpErrors: false,
    retry: { count: 2, timeout: 1 },
    fetchFn: async () => {
      attempts++
      return Response.json({ error: 'e' }, { status: 500 })
    },
  })

  const r = await fetcher.get('someUrl')
  expect(attempts).toBe(3)
  expect(r).toEqual({ error: 'e' })
  randomSpy.mockRestore()
})

it('should still throw on network errors when throwHttpErrors is false', async () => {
  const fetcher = getNonRetryFetcher({
    throwHttpErrors: false,
    fetchFn: async () => {
      throw new TypeError('failed to fetch')
    },
  })

  await expect(fetcher.get('someUrl')).rejects.toThrow(HttpRequestError)
})

it('should take the error cause from the last retry attempt', async () => {
  const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
  let attempts = 0
  const fetcher = getFetcher({
    logger: commonLoggerNoop,
    retry: { count: 1, timeout: 1 },
    fetchFn: async () => {
      attempts++
      return Response.json(
        {
          error: { name: 'AppError', message: `attempt-${attempts}`, data: {} },
        } satisfies BackendErrorResponseObject,
        { status: 500 },
      )
    },
  })

  const { err } = await fetcher.doFetch({ url: 'someUrl' })
  expect((err!.cause as ErrorObject).message).toBe('attempt-2')
  randomSpy.mockRestore()
})

it('should wait the configured retry timeout before the first retry and double it after', async () => {
  vi.useFakeTimers()
  const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
  let attempts = 0
  const fetcher = getFetcher({
    logger: commonLoggerNoop,
    retry: { count: 2, timeout: 1000, timeoutMax: 30_000, timeoutMultiplier: 2 },
    fetchFn: async () => {
      attempts++
      return new Response('bad', { status: 500 })
    },
  })

  const promise = fetcher.doFetch({ url: 'someUrl' })
  await vi.advanceTimersByTimeAsync(999)
  expect(attempts).toBe(1)
  await vi.advanceTimersByTimeAsync(2) // 1st retry after ~1000 (not 2000)
  expect(attempts).toBe(2)
  await vi.advanceTimersByTimeAsync(1998)
  expect(attempts).toBe(2)
  await vi.advanceTimersByTimeAsync(2) // 2nd retry after ~2000 more
  expect(attempts).toBe(3)
  await promise
  randomSpy.mockRestore()
})

it('should use a per-request fetchFn', async () => {
  const fetcher = getNonRetryFetcher()

  const r = await fetcher.get('someUrl', {
    fetchFn: async () => Response.json({ per: 'request' }),
  })
  expect(r).toEqual({ per: 'request' })
})

it('should wait for a retry-after above timeoutMax without clamping it', async () => {
  vi.useFakeTimers()
  let attempts = 0
  const fetcher = getFetcher({
    logger: commonLoggerNoop,
    retry: { count: 1, timeout: 1000, timeoutMax: 30_000, timeoutMultiplier: 2 },
    fetchFn: async () => {
      attempts++
      return new Response('429 rate limited', {
        status: 429,
        headers: { 'retry-after': '60' }, // above timeoutMax (30s)
      })
    },
  })

  const promise = fetcher.doFetch({ url: 'someUrl' })
  await vi.advanceTimersByTimeAsync(59_999)
  expect(attempts).toBe(1) // not retried earlier (not clamped to timeoutMax)
  await vi.advanceTimersByTimeAsync(2)
  expect(attempts).toBe(2) // retried after the full server-indicated 60 seconds
  await promise
})

it('should stop retrying when retry-after exceeds maxRetryAfter', async () => {
  let attempts = 0
  const fetcher = getFetcher({
    logger: commonLoggerNoop,
    retry: { count: 2, timeout: 1000, timeoutMax: 30_000, timeoutMultiplier: 2 },
    fetchFn: async () => {
      attempts++
      return new Response('429 rate limited', {
        status: 429,
        headers: { 'retry-after': '3600' }, // 1 hour, above maxRetryAfter (10 min)
      })
    },
  })

  // Real timers: should resolve immediately, without waiting for the 1 hour delay
  const { err } = await fetcher.doFetch({ url: 'someUrl' })
  _assertIsError(err, HttpRequestError)
  expect(attempts).toBe(1)
})

it('should wait until an x-ratelimit-reset unix timestamp before retrying', async () => {
  vi.useFakeTimers()
  let attempts = 0
  const resetAt = Math.floor(Date.now() / 1000) + 10 // 10 seconds from now
  const fetcher = getFetcher({
    logger: commonLoggerNoop,
    retry: { count: 1, timeout: 1000, timeoutMax: 30_000, timeoutMultiplier: 2 },
    fetchFn: async () => {
      attempts++
      return new Response('429 rate limited', {
        status: 429,
        headers: { 'x-ratelimit-reset': String(resetAt) },
      })
    },
  })

  const promise = fetcher.doFetch({ url: 'someUrl' })
  await vi.advanceTimersByTimeAsync(8500)
  expect(attempts).toBe(1) // not retried immediately, and not scheduled ~55 years from now
  await vi.advanceTimersByTimeAsync(2000)
  expect(attempts).toBe(2)
  await promise
})

it('should stop without another attempt when aborted during the retry backoff', async () => {
  const controller = new AbortController()
  let attempts = 0
  const fetcher = getFetcher({
    logger: commonLoggerNoop,
    retry: { count: 1, timeout: 60_000 },
    fetchFn: async () => {
      attempts++
      return new Response('bad', { status: 500 })
    },
  })

  setTimeout(() => controller.abort(), 20)
  const started = Date.now()
  const { err } = await fetcher.doFetch({ url: 'someUrl', signal: controller.signal })
  _assertIsError(err, HttpRequestError)
  expect(attempts).toBe(1)
  expect(Date.now() - started).toBeLessThan(5000)
})

it('should return the body as a Uint8Array from getBytes', async () => {
  const fetcher = getNonRetryFetcher({
    fetchFn: async () => new Response(new Uint8Array([1, 2, 3])),
  })

  const r = await fetcher.getBytes('someUrl')
  expect(r).toBeInstanceOf(Uint8Array)
  expect(Array.from(r)).toEqual([1, 2, 3])
})

it('should keep an explicitly set content-type when the json option is used', async () => {
  let headers: any
  const fetcher = getNonRetryFetcher({
    fetchFn: async (_url, init) => {
      headers = init.headers
      return Response.json({ ok: 1 })
    },
  })

  await fetcher.post('someUrl', {
    json: { a: 1 },
    headers: { 'Content-Type': 'application/vnd.api+json' },
  })
  expect(headers['content-type']).toBe('application/vnd.api+json')
})

it('should run init hooks lazily, once per instance', async () => {
  let inits = 0
  const seenTokens: any[] = []
  const fetcher = getNonRetryFetcher({
    fetchFn: async (_url, init) => {
      seenTokens.push((init.headers as any)['x-token'])
      return Response.json({ ok: 1 })
    },
  }).onInit(cfg => {
    inits++
    cfg.init.headers['x-token'] = 'secret'
  })

  expect(inits).toBe(0) // lazy - does not run on creation
  await Promise.all([fetcher.get('a'), fetcher.get('b')])
  expect(inits).toBe(1) // concurrent requests share a single init
  await fetcher.get('c')
  expect(inits).toBe(1)
  expect(seenTokens).toEqual(['secret', 'secret', 'secret'])
})

it('should re-run a failing init hook on the next request', async () => {
  let inits = 0
  const fetcher = getNonRetryFetcher({
    fetchFn: async () => Response.json({ ok: 1 }),
  }).onInit(() => {
    inits++
    if (inits === 1) throw new Error('init failed')
  })

  await expect(fetcher.get('someUrl')).rejects.toThrow('init failed')
  expect(await fetcher.get('someUrl')).toEqual({ ok: 1 })
  expect(inits).toBe(2)
})

it('should reinit and retry once when shouldReinit returns true', async () => {
  let inits = 0
  const fetcher = getNonRetryFetcher({
    fetchFn: async (_url, init) => {
      if ((init.headers as any)['x-token'] === 'v2') return Response.json({ ok: 1 })
      return new Response('unauthorized', { status: 401 })
    },
    hooks: { shouldReinit: res => res.statusCode === 401 },
  }).onInit(cfg => {
    inits++
    cfg.init.headers['x-token'] = `v${inits}`
  })

  const r = await fetcher.get('someUrl')
  expect(r).toEqual({ ok: 1 })
  expect(inits).toBe(2)
})

it('should reinit and retry at most once per request', async () => {
  let inits = 0
  let requests = 0
  const fetcher = getNonRetryFetcher({
    logger: commonLoggerNoop,
    fetchFn: async () => {
      requests++
      return new Response('unauthorized', { status: 401 })
    },
    hooks: { shouldReinit: res => res.statusCode === 401 },
  }).onInit(() => {
    inits++
  })

  const [err] = await fetcher.tryFetch({ url: 'someUrl' })
  expect(err).toBeInstanceOf(HttpRequestError)
  expect(requests).toBe(2)
  expect(inits).toBe(2)
})

it('should not reinit when shouldReinit returns false', async () => {
  let requests = 0
  const fetcher = getNonRetryFetcher({
    logger: commonLoggerNoop,
    fetchFn: async () => {
      requests++
      return new Response('server error', { status: 500 })
    },
    hooks: { shouldReinit: res => res.statusCode === 401 },
  }).onInit(() => {})

  const [err] = await fetcher.tryFetch({ url: 'someUrl' })
  expect(err).toBeInstanceOf(HttpRequestError)
  expect(requests).toBe(1)
})

it('should re-run init hooks on the next request after resetInit', async () => {
  let inits = 0
  const fetcher = getNonRetryFetcher({
    fetchFn: async () => Response.json({ ok: 1 }),
  }).onInit(() => {
    inits++
  })

  await fetcher.get('a')
  await fetcher.get('b')
  expect(inits).toBe(1)

  fetcher.resetInit()
  await fetcher.get('c')
  expect(inits).toBe(2)
})

it('should share a single reinit between concurrent stale requests', async () => {
  let inits = 0
  const fetcher = getNonRetryFetcher({
    fetchFn: async (_url, init) => {
      if ((init.headers as any)['x-token'] === 'v2') return Response.json({ ok: 1 })
      return new Response('unauthorized', { status: 401 })
    },
    hooks: { shouldReinit: res => res.statusCode === 401 },
  }).onInit(cfg => {
    inits++
    cfg.init.headers['x-token'] = `v${inits}`
  })

  const [a, b] = await Promise.all([fetcher.get('a'), fetcher.get('b')])
  expect(a).toEqual({ ok: 1 })
  expect(b).toEqual({ ok: 1 })
  expect(inits).toBe(2)
})

it('should return the body and response metadata from fetchWithMeta', async () => {
  const fetcher = getNonRetryFetcher({
    fetchFn: async () => Response.json({ ok: 1 }, { headers: { 'x-next-cursor': 'abc' } }),
  })

  const res = await fetcher.fetchWithMeta<{ ok: number }>({ url: 'someUrl' })
  expect(res.body).toEqual({ ok: 1 })
  expect(res.statusCode).toBe(200)
  expect(res.fetchResponse.headers.get('x-next-cursor')).toBe('abc')
})

it('should not time out the body download when timeoutSeconds is 0', async () => {
  const slowBody = new ReadableStream<Uint8Array>({
    async start(controller) {
      await new Promise(resolve => setTimeout(resolve, 30))
      controller.enqueue(new TextEncoder().encode('slow but fine'))
      controller.close()
    },
  })
  const fetcher = getNonRetryFetcher({
    timeoutSeconds: 0,
    fetchFn: async () => new Response(slowBody),
  })

  const r = await fetcher.getText('someUrl')
  expect(r).toBe('slow but fine')
})

it('should throw from fetchWithMeta on an http error', async () => {
  const fetcher = getNonRetryFetcher({
    fetchFn: async () => new Response('bad', { status: 500 }),
  })

  await expect(fetcher.fetchWithMeta({ url: 'someUrl' })).rejects.toThrow(HttpRequestError)
})
