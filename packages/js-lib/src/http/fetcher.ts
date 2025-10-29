/// <reference lib="es2023" preserve="true" />
/// <reference lib="dom" preserve="true" />
/// <reference lib="dom.iterable" preserve="true" />

import type { ReadableStream as WebReadableStream } from 'node:stream/web'
import { _ms, _since } from '../datetime/time.util.js'
import { isServerSide } from '../env.js'
import { _assertErrorClassOrRethrow, _assertIsError } from '../error/assert.js'
import type { ErrorLike, ErrorObject } from '../error/error.model.js'
import {
  _anyToError,
  _anyToErrorObject,
  _errorDataAppend,
  _errorLikeToErrorObject,
  HttpRequestError,
  TimeoutError,
  UnexpectedPassError,
} from '../error/error.util.js'
import { _clamp } from '../number/number.util.js'
import {
  _filterFalsyValues,
  _filterNullishValues,
  _filterUndefinedValues,
  _mapKeys,
  _merge,
  _omit,
  _pick,
} from '../object/object.util.js'
import { pDelay } from '../promise/pDelay.js'
import { pTimeout } from '../promise/pTimeout.js'
import { _jsonParse, _jsonParseIfPossible } from '../string/json.util.js'
import { _stringify } from '../string/stringify.js'
import type {
  AnyObject,
  ErrorDataTuple,
  NumberOfMilliseconds,
  UnixTimestampMillis,
} from '../types.js'
import type {
  FetcherAfterResponseHook,
  FetcherBeforeRequestHook,
  FetcherBeforeRetryHook,
  FetcherCfg,
  FetcherGraphQLOptions,
  FetcherNormalizedCfg,
  FetcherOnErrorHook,
  FetcherOptions,
  FetcherRequest,
  FetcherResponse,
  FetcherResponseType,
  FetcherRetryOptions,
  FetchFunction,
  GraphQLResponse,
  RequestInitNormalized,
} from './fetcher.model.js'
import type { HttpStatusFamily } from './http.model.js'
import { HTTP_METHODS } from './http.model.js'

/**
 * Experimental wrapper around Fetch.
 * Works in both Browser and Node, using `globalThis.fetch`.
 */
export class Fetcher {
  /**
   * Included in UserAgent when run in Node.
   * In the browser it's not included, as we want "browser own" UserAgent to be included instead.
   *
   * Version is to be incremented every time a difference in behaviour (or a bugfix) is done.
   */
  static readonly VERSION = 3
  /**
   * userAgent is statically exposed as Fetcher.userAgent.
   * It can be modified globally, and will be used (read) at the start of every request.
   */
  static userAgent = isServerSide() ? `fetcher/${this.VERSION}` : undefined

  private constructor(cfg: FetcherCfg & FetcherOptions = {}) {
    if (typeof globalThis.fetch !== 'function') {
      throw new TypeError('globalThis.fetch is not available')
    }

    this.cfg = this.normalizeCfg(cfg)

    // Dynamically create all helper methods
    for (const method of HTTP_METHODS) {
      const m = method.toLowerCase()

      // responseType=void
      ;(this as any)[`${m}Void`] = async (url: string, opt?: FetcherOptions): Promise<void> => {
        return await this.fetch<void>({
          url,
          method,
          responseType: 'void',
          ...opt,
        })
      }

      if (method === 'HEAD') return // responseType=text
      ;(this as any)[`${m}Text`] = async (url: string, opt?: FetcherOptions): Promise<string> => {
        return await this.fetch<string>({
          url,
          method,
          responseType: 'text',
          ...opt,
        })
      }

      // Default responseType=json, but overridable
      ;(this as any)[m] = async <T = unknown>(url: string, opt?: FetcherOptions): Promise<T> => {
        return await this.fetch<T>({
          url,
          method,
          responseType: 'json',
          ...opt,
        })
      }
    }
  }

  /**
   * Add BeforeRequest hook at the end of the hooks list.
   */
  onBeforeRequest(hook: FetcherBeforeRequestHook): this {
    ;(this.cfg.hooks.beforeRequest ||= []).push(hook)
    return this
  }

  onAfterResponse(hook: FetcherAfterResponseHook): this {
    ;(this.cfg.hooks.afterResponse ||= []).push(hook)
    return this
  }

  onBeforeRetry(hook: FetcherBeforeRetryHook): this {
    ;(this.cfg.hooks.beforeRetry ||= []).push(hook)
    return this
  }

  onError(hook: FetcherOnErrorHook): this {
    ;(this.cfg.hooks.onError ||= []).push(hook)
    return this
  }

  cfg: FetcherNormalizedCfg

  static create(cfg: FetcherCfg & FetcherOptions = {}): Fetcher {
    return new Fetcher(cfg)
  }

  // These methods are generated dynamically in the constructor
  // These default methods use responseType=json
  get!: <T = unknown>(url: string, opt?: FetcherOptions) => Promise<T>
  post!: <T = unknown>(url: string, opt?: FetcherOptions) => Promise<T>
  put!: <T = unknown>(url: string, opt?: FetcherOptions) => Promise<T>
  patch!: <T = unknown>(url: string, opt?: FetcherOptions) => Promise<T>
  delete!: <T = unknown>(url: string, opt?: FetcherOptions) => Promise<T>

  // responseType=text
  getText!: (url: string, opt?: FetcherOptions) => Promise<string>
  postText!: (url: string, opt?: FetcherOptions) => Promise<string>
  putText!: (url: string, opt?: FetcherOptions) => Promise<string>
  patchText!: (url: string, opt?: FetcherOptions) => Promise<string>
  deleteText!: (url: string, opt?: FetcherOptions) => Promise<string>

  // responseType=void (no body fetching/parsing)
  getVoid!: (url: string, opt?: FetcherOptions) => Promise<void>
  postVoid!: (url: string, opt?: FetcherOptions) => Promise<void>
  putVoid!: (url: string, opt?: FetcherOptions) => Promise<void>
  patchVoid!: (url: string, opt?: FetcherOptions) => Promise<void>
  deleteVoid!: (url: string, opt?: FetcherOptions) => Promise<void>
  headVoid!: (url: string, opt?: FetcherOptions) => Promise<void>

  /**
   * Small convenience wrapper that allows to issue GraphQL queries.
   * In practice, all it does is:
   * - Defines convenience `query` input option
   * - Unwraps `response.data`
   * - Unwraps `response.errors` and throws, if it's defined (as GQL famously returns http 200 even for errors)
   *
   * Currently it only unwraps and uses the first error from the `errors` array, for simplicity.
   *
   * @experimental
   */
  async queryGraphQL<T = unknown>(opt: FetcherGraphQLOptions): Promise<T> {
    opt.method ||= this.cfg.init.method // defaults to GET

    const payload: AnyObject = _filterFalsyValues({
      query: opt.query,
      variables: opt.variables,
    })

    // Checking the query length, and not allowing to use GET if above 1900
    if (opt.method === 'GET' && opt.query.length > 1900) {
      opt.method = 'POST'
    }

    if (opt.method === 'GET') {
      opt.searchParams = {
        ...opt.searchParams,
        ...payload,
      }
    } else {
      opt.json = payload
    }

    const res = await this.doFetch<GraphQLResponse<T>>(opt)
    if (res.err) {
      throw res.err
    }

    if (res.body.errors) {
      // unwrap errors and throw
      const err = res.body.errors[0]!

      // todo: consider creating a new GraphQLError class for this
      throw new HttpRequestError(err.message, {
        ...payload, // query and variables
        errors: res.body.errors, // full errors payload returned
        response: res.fetchResponse,
        responseStatusCode: res.statusCode,
        requestUrl: res.req.fullUrl,
        requestBaseUrl: this.cfg.baseUrl,
        requestMethod: res.req.init.method,
        requestSignature: res.signature,
        requestDuration: Date.now() - res.req.started,
      })
    }

    const { data } = res.body
    if (opt.unwrapObject) {
      return (data as any)[opt.unwrapObject]
    }

    return data
  }

  // responseType=readableStream
  /**
   * Returns raw fetchResponse.body, which is a ReadableStream<Uint8Array>
   *
   * More on streams and Node interop:
   * https://css-tricks.com/web-streams-everywhere-and-fetch-for-node-js/
   */
  async getReadableStream(
    url: string,
    opt?: FetcherOptions,
  ): Promise<WebReadableStream<Uint8Array>> {
    return await this.fetch({
      url,
      responseType: 'readableStream',
      ...opt,
    })
  }

  async fetch<T = unknown>(opt: FetcherOptions): Promise<T> {
    const res = await this.doFetch<T>(opt)
    if (res.err) {
      throw res.err
    }
    return res.body
  }

  /**
   * Execute fetch and expect/assert it to return an Error (which will be wrapped in
   * HttpRequestError as it normally would).
   * If fetch succeeds, which is unexpected, it'll throw an UnexpectedPass error.
   * Useful in unit testing.
   */
  async expectError(opt: FetcherOptions): Promise<HttpRequestError> {
    const res = await this.doFetch(opt)

    if (!res.err) {
      throw new UnexpectedPassError('Fetch was expected to error')
    }

    _assertIsError(res.err, HttpRequestError)
    return res.err
  }

  /**
   * Like pTry - returns a [err, data] tuple (aka ErrorDataTuple).
   * err, if defined, is strictly HttpRequestError.
   * UPD: actually not, err is typed as Error, as it feels unsafe to guarantee error type.
   * UPD: actually yes - it will return HttpRequestError, and throw if there's an error
   * of any other type.
   */
  async tryFetch<T = unknown>(opt: FetcherOptions): Promise<ErrorDataTuple<T, HttpRequestError>> {
    const res = await this.doFetch<T>(opt)
    if (res.err) {
      _assertErrorClassOrRethrow(res.err, HttpRequestError)
      return [res.err, null]
    }
    return [null, res.body]
  }

  /**
   * Returns FetcherResponse.
   * Never throws, returns `err` property in the response instead.
   * Use this method instead of `throwHttpErrors: false` or try-catching.
   *
   * Note: responseType defaults to `void`, so, override it if you expect different.
   */
  async doFetch<T = unknown>(opt: FetcherOptions): Promise<FetcherResponse<T>> {
    const req = this.normalizeOptions(opt)
    const { logger } = this.cfg
    const {
      timeoutSeconds,
      init: { method },
    } = req

    for (const hook of this.cfg.hooks.beforeRequest || []) {
      await hook(req)
    }

    const isFullUrl = req.fullUrl.includes('://')
    const fullUrl = isFullUrl ? new URL(req.fullUrl) : undefined
    const shortUrl = fullUrl ? this.getShortUrl(fullUrl) : req.fullUrl
    const signature = [method, shortUrl].join(' ')

    const res = {
      req,
      retryStatus: {
        retryAttempt: 0,
        retryStopped: false,
        retryTimeout: req.retry.timeout,
      },
      signature,
    } as FetcherResponse<any>

    while (!res.retryStatus.retryStopped) {
      req.started = Date.now() as UnixTimestampMillis

      // setup timeout
      let timeoutId: number | undefined
      if (timeoutSeconds) {
        // Used for Request timeout (when timeoutSeconds is set),
        // but also for "downloadBody" timeout (even after request returned with 200, but before we loaded the body)
        // UPD: no, not using for "downloadBody" currently
        const abortController = new AbortController()
        req.init.signal = abortController.signal
        timeoutId = setTimeout(() => {
          // console.log(`actual request timed out in ${_since(req.started)}`)
          // Apparently, providing a `string` reason to abort() causes Undici to throw `invalid_argument` error,
          // so, we're wrapping it in a TimeoutError instance
          abortController.abort(new TimeoutError(`request timed out after ${timeoutSeconds} sec`))
        }, timeoutSeconds * 1000) as any as number
      }

      if (req.logRequest) {
        const { retryAttempt } = res.retryStatus
        logger.log(
          [' >>', signature, retryAttempt && `try#${retryAttempt + 1}/${req.retry.count + 1}`]
            .filter(Boolean)
            .join(' '),
        )
        if (req.logRequestBody && req.init.body) {
          logger.log(req.init.body) // todo: check if we can _inspect it
        }
      }

      try {
        res.fetchResponse = await (this.cfg.overrideFetchFn || Fetcher.callNativeFetch)(
          req.fullUrl,
          req.init,
          this.cfg.fetchFn,
        )
        res.ok = res.fetchResponse.ok
        // important to set it to undefined, otherwise it can keep the previous value (from previous try)
        res.err = undefined
      } catch (err) {
        // For example, CORS error would result in "TypeError: failed to fetch" here
        // or, `fetch failed` with the cause of `unexpected redirect`
        res.err = _anyToError(err)
        res.ok = false
        // important to set it to undefined, otherwise it can keep the previous value (from previous try)
        res.fetchResponse = undefined
      } finally {
        clearTimeout(timeoutId)
        // Separate Timeout will be introduced to "download and parse the body"
      }
      res.statusFamily = this.getStatusFamily(res)
      res.statusCode = res.fetchResponse?.status

      if (res.fetchResponse?.ok || !req.throwHttpErrors) {
        try {
          // We are applying a separate Timeout (as long as original Timeout for now) to "download and parse the body"
          await pTimeout(
            async () =>
              await this.onOkResponse(res as FetcherResponse<T> & { fetchResponse: Response }),
            {
              timeout: timeoutSeconds * 1000 || Number.POSITIVE_INFINITY,
              name: 'Fetcher.downloadBody',
            },
          )
        } catch (err) {
          // Important to cancel the original request to not keep it running (and occupying resources)
          // UPD: no, we probably don't need to, because "request" has already completed, it's just the "body" is pending
          // if (err instanceof TimeoutError) {}

          // onOkResponse can still fail, e.g when loading/parsing json, text or doing other response manipulation
          res.err = _anyToError(err)
          res.ok = false
          await this.onNotOkResponse(res)
        }
      } else {
        // !res.ok
        await this.onNotOkResponse(res)
      }
    }

    if (res.err) {
      _errorDataAppend(res.err, req.errorData)

      req.onError?.(res.err)

      for (const hook of this.cfg.hooks.onError || []) {
        await hook(res.err)
      }
    }

    for (const hook of this.cfg.hooks.afterResponse || []) {
      await hook(res)
    }

    return res
  }

  private async onOkResponse(
    res: FetcherResponse<any> & { fetchResponse: Response },
  ): Promise<void> {
    const { req } = res
    const { responseType } = res.req

    // This function is subject to a separate timeout to "download and parse the data"
    if (responseType === 'json') {
      if (res.fetchResponse.body) {
        const text = await res.fetchResponse.text()

        if (text) {
          res.body = text
          res.body = _jsonParse(text, req.jsonReviver)
          // Error while parsing json can happen - it'll be handled upstream
        } else {
          // Body had a '' (empty string)
          res.body = {}
        }
      } else {
        // if no body: set responseBody as {}
        // do not throw a "cannot parse null as Json" error
        res.body = {}
      }
    } else if (responseType === 'text') {
      res.body = res.fetchResponse.body ? await res.fetchResponse.text() : ''
    } else if (responseType === 'arrayBuffer') {
      res.body = res.fetchResponse.body ? await res.fetchResponse.arrayBuffer() : {}
    } else if (responseType === 'blob') {
      res.body = res.fetchResponse.body ? await res.fetchResponse.blob() : {}
    } else if (responseType === 'readableStream') {
      res.body = res.fetchResponse.body

      if (res.body === null) {
        // Error is to be handled upstream
        throw new Error('fetchResponse.body is null')
      }
    }

    res.retryStatus.retryStopped = true

    // res.err can happen on `failed to fetch` type of error, e.g JSON.parse, CORS, unexpected redirect
    if ((!res.err || !req.throwHttpErrors) && req.logResponse) {
      const { retryAttempt } = res.retryStatus
      const { logger } = this.cfg
      logger.log(
        [
          ' <<',
          res.fetchResponse.status,
          res.signature,
          retryAttempt && `try#${retryAttempt + 1}/${req.retry.count + 1}`,
          _since(res.req.started),
        ]
          .filter(Boolean)
          .join(' '),
      )

      if (req.logResponseBody && res.body !== undefined) {
        logger.log(res.body)
      }
    }
  }

  /**
   * This method exists to be able to easily mock it.
   * It is static, so mocking applies to ALL instances (even future ones) of Fetcher at once.
   */
  static async callNativeFetch(
    url: string,
    init: RequestInitNormalized,
    fetchFn?: FetchFunction,
  ): Promise<Response> {
    return await (fetchFn || globalThis.fetch)(url, init)
  }

  private async onNotOkResponse(res: FetcherResponse): Promise<void> {
    let cause: ErrorObject

    // Try to fetch body and attach to res.body
    // (but don't fail if it doesn't work)
    if (!res.body && res.fetchResponse) {
      try {
        res.body = _jsonParseIfPossible(await res.fetchResponse.text())
      } catch {
        // ignore body fetching/parsing errors at this point
      }
    }

    if (res.err) {
      // This is only possible on JSON.parse error, or CORS error,
      // or `unexpected redirect`
      // This check should go first, to avoid calling .text() twice (which will fail)
      cause = _errorLikeToErrorObject(res.err)
    } else if (res.body) {
      cause = _anyToErrorObject(res.body)
    } else {
      cause = {
        name: 'Error',
        message: 'Fetch failed',
        data: {},
      }
    }

    let responseStatusCode = res.fetchResponse?.status || 0
    if (res.statusFamily === 2) {
      // important to reset responseStatusCode to 0 in this case, as status 2xx can be misleading
      res.statusFamily = undefined
      res.statusCode = undefined
      responseStatusCode = 0
    }

    const message = [res.statusCode, res.signature].filter(Boolean).join(' ')

    res.err = new HttpRequestError(
      message,
      _filterNullishValues({
        response: res.fetchResponse,
        responseStatusCode,
        // These properties are provided to be used in e.g custom Sentry error grouping
        // Actually, disabled now, to avoid unnecessary error printing when both msg and data are printed
        // Enabled, cause `data` is not printed by default when error is HttpError
        // method: req.method,
        // tryCount: req.tryCount,
        requestUrl: res.req.fullUrl,
        requestBaseUrl: this.cfg.baseUrl || undefined,
        requestMethod: res.req.init.method,
        requestSignature: res.signature,
        requestDuration: Date.now() - res.req.started,
      }),
      {
        cause,
      },
    )

    await this.processRetry(res)
  }

  private async processRetry(res: FetcherResponse): Promise<void> {
    const { retryStatus } = res

    if (!this.shouldRetry(res)) {
      retryStatus.retryStopped = true
    }

    for (const hook of this.cfg.hooks.beforeRetry || []) {
      await hook(res)
    }

    const { count, timeoutMultiplier, timeoutMax } = res.req.retry

    if (retryStatus.retryAttempt >= count) {
      retryStatus.retryStopped = true
    }

    // We don't log "last error", because it will be thrown and logged by consumer,
    // but we should log all previous errors, otherwise they are lost.
    // Here is the right place where we know it's not the "last error".
    // lastError = retryStatus.retryStopped
    // We need to log the response "anyway" if logResponse is true
    if (res.err && (!retryStatus.retryStopped || res.req.logResponse)) {
      this.cfg.logger.error(
        [
          ' <<',
          res.fetchResponse?.status || 0,
          res.signature,
          count &&
            (retryStatus.retryAttempt || !retryStatus.retryStopped) &&
            `try#${retryStatus.retryAttempt + 1}/${count + 1}`,
          _since(res.req.started),
        ]
          .filter(Boolean)
          .join(' ') + '\n',
        // We're stringifying the error here, otherwise Sentry shows it as [object Object]
        _stringify(res.err.cause || res.err),
      )
    }

    if (retryStatus.retryStopped) return

    retryStatus.retryAttempt++
    retryStatus.retryTimeout = _clamp(retryStatus.retryTimeout * timeoutMultiplier, 0, timeoutMax)

    const timeout = this.getRetryTimeout(res)
    if (res.req.debug) {
      this.cfg.logger.log(` .. ${res.signature} waiting ${_ms(timeout)}`)
    }
    await pDelay(timeout)
  }

  private getRetryTimeout(res: FetcherResponse): NumberOfMilliseconds {
    let timeout: NumberOfMilliseconds = 0

    // Handling http 429 with specific retry headers
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After
    if (res.fetchResponse && [429, 503].includes(res.fetchResponse.status)) {
      const retryAfterStr =
        res.fetchResponse.headers.get('retry-after') ??
        res.fetchResponse.headers.get('x-ratelimit-reset')
      if (retryAfterStr) {
        if (Number(retryAfterStr)) {
          timeout = Number(retryAfterStr) * 1000
        } else {
          const date = new Date(retryAfterStr)
          if (!Number.isNaN(date as any)) {
            timeout = Number(date) - Date.now()
          }
        }

        this.cfg.logger.log(`retry-after: ${retryAfterStr}`)
        if (!timeout) {
          this.cfg.logger.warn('retry-after could not be parsed')
        }
      }
    }

    if (!timeout) {
      const noise = Math.random() * 500
      timeout = res.retryStatus.retryTimeout + noise
    }

    return timeout
  }

  /**
   * Default is yes,
   * unless there's reason not to (e.g method is POST).
   *
   * statusCode of 0 (or absense of it) will BE retried.
   */
  private shouldRetry(res: FetcherResponse): boolean {
    const { retryPost, retry3xx, retry4xx, retry5xx } = res.req
    const { method } = res.req.init
    if (method === 'POST' && !retryPost) return false
    const { statusFamily } = res
    const statusCode = res.fetchResponse?.status || 0
    if (statusFamily === 5 && !retry5xx) return false
    if ([408, 429].includes(statusCode)) {
      // these codes are always retried
      return true
    }
    if (statusFamily === 4 && !retry4xx) return false
    if (statusFamily === 3 && !retry3xx) return false

    // should not retry on `unexpected redirect` in error.cause.cause
    if (
      (res.err?.cause as ErrorLike | undefined)?.cause?.message?.includes('unexpected redirect')
    ) {
      return false
    }

    return true // default is true
  }

  private getStatusFamily(res: FetcherResponse): HttpStatusFamily | undefined {
    const status = res.fetchResponse?.status
    if (!status) return
    if (status >= 500) return 5
    if (status >= 400) return 4
    if (status >= 300) return 3
    if (status >= 200) return 2
    if (status >= 100) return 1
  }

  /**
   * Returns url without baseUrl and before ?queryString
   */
  private getShortUrl(url: URL): string {
    const { baseUrl } = this.cfg

    if (url.password) {
      url = new URL(url.toString()) // prevent original url mutation
      url.password = '[redacted]'
    }

    let shortUrl = url.toString()

    if (!this.cfg.logWithSearchParams) {
      shortUrl = shortUrl.split('?')[0]!
    }

    if (!this.cfg.logWithBaseUrl && baseUrl && shortUrl.startsWith(baseUrl)) {
      shortUrl = shortUrl.slice(baseUrl.length)
    }

    return shortUrl
  }

  private normalizeCfg(cfg: FetcherCfg & FetcherOptions): FetcherNormalizedCfg {
    if (cfg.baseUrl?.endsWith('/')) {
      console.warn(`Fetcher: baseUrl should not end with slash: ${cfg.baseUrl}`)
      cfg.baseUrl = cfg.baseUrl.slice(0, cfg.baseUrl.length - 1)
    }
    const { debug = false } = cfg

    const norm: FetcherNormalizedCfg = _merge(
      {
        baseUrl: '',
        inputUrl: '',
        responseType: 'json',
        searchParams: {},
        timeoutSeconds: 30,
        retryPost: false,
        retry3xx: false,
        retry4xx: false,
        retry5xx: true,
        // logger: console, Danger! doing this mutates console!
        logger: cfg.logger || console,
        debug,
        logRequest: debug,
        logRequestBody: debug,
        logResponse: debug,
        logResponseBody: debug,
        logWithBaseUrl: isServerSide(),
        logWithSearchParams: true,
        retry: { ...defaultRetryOptions },
        init: {
          method: cfg.method || 'GET',
          headers: _filterNullishValues({
            'user-agent': Fetcher.userAgent,
            ...cfg.headers,
          }),
          credentials: cfg.credentials,
          redirect: cfg.redirect,
          dispatcher: cfg.dispatcher,
        },
        hooks: {},
        throwHttpErrors: true,
        errorData: {},
      },
      _omit(cfg, ['method', 'credentials', 'headers', 'redirect', 'logger']),
    )

    norm.init.headers = _mapKeys(norm.init.headers, k => k.toLowerCase())

    return norm
  }

  private normalizeOptions(opt: FetcherOptions): FetcherRequest {
    const req: FetcherRequest = {
      ..._pick(this.cfg, [
        'timeoutSeconds',
        'retryPost',
        'retry4xx',
        'retry5xx',
        'responseType',
        'jsonReviver',
        'logRequest',
        'logRequestBody',
        'logResponse',
        'logResponseBody',
        'debug',
        'throwHttpErrors',
        'errorData',
      ]),
      started: Date.now() as UnixTimestampMillis,
      ..._omit(opt, ['method', 'headers', 'credentials']),
      inputUrl: opt.url || '',
      fullUrl: opt.url || '',
      retry: {
        ...this.cfg.retry,
        ..._filterUndefinedValues(opt.retry || {}),
      },
      init: _merge(
        {
          ...this.cfg.init,
          headers: {
            ...this.cfg.init.headers, // this avoids mutation
            'user-agent': Fetcher.userAgent, // re-load it here, to support setting it globally post-fetcher-creation
          },
          method: opt.method || this.cfg.init.method,
          credentials: opt.credentials || this.cfg.init.credentials,
          redirect: opt.redirect || this.cfg.init.redirect || 'follow',
        },
        {
          headers: _mapKeys(opt.headers || {}, k => k.toLowerCase()),
        } satisfies RequestInit,
      ),
    }

    // Because all header values are stringified, so `a: undefined` becomes `undefined` as a string
    _filterNullishValues(req.init.headers, { mutate: true })

    // setup url
    const baseUrl = opt.baseUrl || this.cfg.baseUrl
    if (baseUrl) {
      if (req.fullUrl.startsWith('/')) {
        console.warn('Fetcher: url should not start with / when baseUrl is specified')
        req.fullUrl = req.fullUrl.slice(1)
      }
      req.fullUrl = `${baseUrl}/${req.inputUrl}`
    }

    const searchParams = _filterUndefinedValues({
      ...this.cfg.searchParams,
      ...opt.searchParams,
    })

    if (Object.keys(searchParams).length) {
      const qs = new URLSearchParams(searchParams).toString()
      req.fullUrl += (req.fullUrl.includes('?') ? '&' : '?') + qs
    }

    // setup request body
    // Unless it's a well-defined input type (json, text) - content-type is set automatically by the native fetch
    if (opt.json !== undefined) {
      req.init.body = JSON.stringify(opt.json)
      req.init.headers['content-type'] = 'application/json'
    } else if (opt.text !== undefined) {
      req.init.body = opt.text
      req.init.headers['content-type'] = 'text/plain'
    } else if (opt.form) {
      if (opt.form instanceof URLSearchParams || opt.form instanceof FormData) {
        req.init.body = opt.form
      } else {
        req.init.body = new URLSearchParams(opt.form)
        req.init.headers['content-type'] = 'application/x-www-form-urlencoded'
      }
    } else if (opt.body !== undefined) {
      req.init.body = opt.body
    }

    // Unless `accept` header was already set - set it based on responseType
    req.init.headers['accept'] ||= acceptByResponseType[req.responseType]

    return req
  }
}

export function getFetcher(cfg: FetcherCfg & FetcherOptions = {}): Fetcher {
  return Fetcher.create(cfg)
}

const acceptByResponseType: Record<FetcherResponseType, string> = {
  text: 'text/plain',
  json: 'application/json',
  void: '*/*',
  readableStream: 'application/octet-stream',
  arrayBuffer: 'application/octet-stream',
  blob: 'application/octet-stream',
}

const defaultRetryOptions: FetcherRetryOptions = {
  count: 2,
  timeout: 1000,
  timeoutMax: 30_000,
  timeoutMultiplier: 2,
}
