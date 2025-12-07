import { expect, expectTypeOf, test, vi } from 'vitest'
import { _range } from '../array/range.js'
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
import { commonLoggerNoop } from '../log/commonLogger.js'
import { _omit } from '../object/object.util.js'
import { _stringify } from '../string/stringify.js'
import type { UnixTimestampMillis } from '../types.js'
import { Fetcher, getFetcher } from './fetcher.js'
import type { FetcherCfg, FetcherOptions, FetcherRequest } from './fetcher.model.js'

test('defaults', () => {
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
          "user-agent": "fetcher/3",
        },
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

  expect(fetcher.cfg.logger).toBe(console)

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
          "user-agent": "fetcher/3",
        },
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
        "timeout": 1000,
        "timeoutMax": 30000,
        "timeoutMultiplier": 2,
      },
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

test('should not mutate console', () => {
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

test('mocking fetch', async () => {
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
  // oxlint-disable-next-line @typescript-eslint/no-base-to-string
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

test('fetchFn', async () => {
  const fetcher = getNonRetryFetcher({
    fetchFn: async (url, _init) => {
      return Response.json({ url })
    },
  })

  const url = 'abc'
  const r = await fetcher.get(url)
  expect(r).toEqual({ url })
})

test('throwHttpErrors = false', async () => {
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

test('json parse error', async () => {
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

test('paginate', async () => {
  const fetcher = getNonRetryFetcher({
    debug: true,
    logResponseBody: true,
  })

  const pageSize = 10
  vi.spyOn(Fetcher, 'callNativeFetch').mockImplementation(async url => {
    const u = new URL(url)
    const page = Number(u.searchParams.get('page'))
    if (page > pageSize) return Response.json([])
    return Response.json(_range((page - 1) * pageSize, page * pageSize))
  })

  const results: number[] = []

  // UPD: Pagination API was removed as "not ergonomic enough"
  // Use "while(true) loop" instead
  //
  // await fetcher.get<number[]>('https://a.com', {
  //   searchParams: {
  //     page: 1,
  //   },
  //   paginate: (res, opt) => {
  //     if (!res.body.length) return false // no more items
  //     results.push(...res.body)
  //
  //     opt.searchParams!['page']++
  //     return true
  //   },
  // })
  //
  // expect(results).toEqual(_range(0, pageSize * 10))

  // Alternative implementation without Pagination API (for comparison)
  let page = 1

  while (true) {
    const r = await fetcher.get<number[]>('https://a.com', {
      searchParams: {
        page,
      },
    })

    if (!r.length) break
    results.push(...r)
    page++
  }

  expect(results).toEqual(_range(0, pageSize * 10))
})

test('retryAfter', async () => {
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

  const r = await fetcher.getText('')
  expect(r).toBe('ok')
})

test('retryAfter date', async () => {
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

  const r = await fetcher.getText('')
  expect(r).toBe('ok')
})

test('tryFetch', async () => {
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
  if (err2) {
    expectTypeOf(err2).toEqualTypeOf<HttpRequestError>()
  } else {
    expectTypeOf(data2).toEqualTypeOf<{ ok: boolean }>()
    expect(data2).toEqual({ ok: true })
  }
})

test('should not mutate headers', async () => {
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
      "user-agent": "fetcher/3",
    }
  `)
  expect(a[1]).toMatchInlineSnapshot(`
    {
      "accept": "application/json",
      "user-agent": "fetcher/3",
    }
  `)
  expect(a[0]).not.toBe(a[1])
})

test('fetcher response headers', async () => {
  const fetcher = getNonRetryFetcher()

  vi.spyOn(Fetcher, 'callNativeFetch').mockResolvedValue(Response.json({ ok: 1 }))

  const { fetchResponse } = await fetcher.doFetch({})
  expect(Object.fromEntries(fetchResponse!.headers)).toMatchInlineSnapshot(`
    {
      "content-type": "application/json",
    }
  `)
})

test('expectError', async () => {
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

test('onError', async () => {
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

test('errorData', async () => {
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

test('should allow to change user-agent', async () => {
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

test('HttpRequestError', async () => {
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
