/// <reference lib="es2022" preserve="true" />
/// <reference lib="dom" preserve="true" />

import type { Dispatcher } from 'undici'
import type { ErrorData } from '../error/error.model.js'
import type { CommonLogger } from '../log/commonLogger.js'
import type {
  AnyObject,
  NumberOfMilliseconds,
  Promisable,
  Reviver,
  UnixTimestampMillis,
} from '../types.js'
import type { HttpMethod, HttpStatusFamily } from './http.model.js'

export interface FetcherNormalizedCfg
  extends
    Required<Omit<FetcherCfg, 'dispatcher' | 'name'>>,
    Omit<
      FetcherRequest,
      | 'started'
      | 'fullUrl'
      | 'logRequest'
      | 'logRequestBody'
      | 'logResponse'
      | 'logResponseBody'
      | 'debug'
      | 'redirect'
      | 'credentials'
      | 'throwHttpErrors'
      | 'errorData'
    > {
  logger: CommonLogger
  searchParams: Record<string, any>
  name?: string
}

export type FetcherBeforeRequestHook = (req: FetcherRequest) => Promisable<void>
export type FetcherAfterResponseHook = <BODY = unknown>(
  res: FetcherResponse<BODY>,
) => Promisable<void>
export type FetcherBeforeRetryHook = <BODY = unknown>(
  res: FetcherResponse<BODY>,
) => Promisable<void>
/**
 * Allows to mutate the error.
 * Cannot cancel/prevent the error - AfterResponseHook can be used for that instead.
 */
export type FetcherOnErrorHook = (err: Error) => Promisable<void>

/**
 * FetcherCfg: configuration of the Fetcher instance. One per instance.
 * FetcherOptions: options for a single request. One per request.
 */
export interface FetcherCfg {
  /**
   * Should **not** contain trailing slash.
   */
  baseUrl?: string

  /**
   * "Name" of the fetcher.
   * Accessible inside HttpRequestError, to be able to construct a good fingerprint.
   * If name is not provided - baseUrl is used to identify a Fetcher.
   */
  name?: string

  /**
   * Default rule is that you **are allowed** to mutate req, res, res.retryStatus
   * properties of hook function arguments.
   * If you throw an error from the hook - it will be re-thrown as-is.
   */
  hooks?: {
    /**
     * Allows to mutate req.
     */
    beforeRequest?: FetcherBeforeRequestHook[]
    /**
     * Allows to mutate res.
     * If you set `res.err` - it will be thrown.
     */
    afterResponse?: FetcherAfterResponseHook[]
    /**
     * Allows to mutate res.retryStatus to override retry behavior.
     */
    beforeRetry?: FetcherBeforeRetryHook[]

    onError?: FetcherOnErrorHook[]
  }

  /**
   * If Fetcher has an error - `errorData` object will be appended to the error data.
   * Like this:
   *
   * _errorDataAppend(err, cfg.errorData)
   *
   * So you, for example, can append a `fingerprint` to any error thrown from this fetcher.
   */
  errorData?: ErrorData | undefined

  /**
   * If true - enables all possible logging.
   */
  debug?: boolean
  logRequest?: boolean
  logRequestBody?: boolean
  logResponse?: boolean
  logResponseBody?: boolean

  /**
   * Controls if `baseUrl` should be included in logs (both success and error).
   *
   * Defaults to `true` on ServerSide and `false` on ClientSide.
   *
   * Reasoning.
   *
   * ClientSide often uses one main "backend host".
   * Not including baseUrl improves Sentry error grouping.
   *
   * ServerSide often uses one Fetcher instance per 3rd-party API.
   * Not including baseUrl can introduce confusion of "which API is it?".
   */
  logWithBaseUrl?: boolean

  /**
   * Default to true.
   * Set to false to strip searchParams from url when logging (both success and error)
   */
  logWithSearchParams?: boolean

  /**
   * Defaults to `console`.
   */
  logger?: CommonLogger

  throwHttpErrors?: boolean

  /**
   * Pass an Undici Dispatcher.
   * (Node.js only)
   *
   * @experimental
   */
  dispatcher?: Dispatcher
}

export interface FetcherRetryStatus {
  retryAttempt: number
  retryTimeout: NumberOfMilliseconds
  retryStopped: boolean
}

export interface FetcherRetryOptions {
  count: number
  timeout: NumberOfMilliseconds
  timeoutMax: NumberOfMilliseconds
  timeoutMultiplier: number
}

export interface FetcherRequest extends Omit<
  FetcherOptions,
  'method' | 'headers' | 'baseUrl' | 'url'
> {
  /**
   * inputUrl is only the part that was passed in the request,
   * without baseUrl or searchParams.
   */
  inputUrl: string
  /**
   * fullUrl includes baseUrl and searchParams.
   */
  fullUrl: string
  init: RequestInitNormalized
  responseType: FetcherResponseType
  timeoutSeconds: number
  retry: FetcherRetryOptions
  retryPost: boolean
  retry3xx: boolean
  retry4xx: boolean
  retry5xx: boolean
  started: UnixTimestampMillis
}

export interface FetcherGraphQLOptions extends FetcherOptions {
  query: string
  variables?: AnyObject
  /**
   * When querying singular entities, it may be convenient to specify 1st level object to unwrap.
   * Example:
   * {
   *   homePage: { ... }
   * }
   *
   * unwrapObject: 'homePage'
   *
   * would return the contents of `{ ... }`
   */
  unwrapObject?: string
}

/**
 * FetcherCfg: configuration of the Fetcher instance. One per instance.
 * FetcherOptions: options for a single request. One per request.
 */
export interface FetcherOptions {
  method?: HttpMethod

  /**
   * If defined - this `url` will override the original given `url`.
   * baseUrl (and searchParams) will still modify it.
   */
  url?: string

  baseUrl?: string

  /**
   * Default: 30.
   *
   * Timeout applies to both get the response and retrieve the body (e.g `await res.json()`),
   * so both should finish within this single timeout (not each).
   */
  timeoutSeconds?: number

  /**
   * Supports all the types that RequestInit.body supports.
   *
   * Useful when you want to e.g pass FormData.
   */
  body?: Blob | BufferSource | FormData | URLSearchParams | string

  /**
   * Same as `body`, but also conveniently sets the
   * Content-Type header to `text/plain`
   */
  text?: string

  /**
   * Same as `body`, but:
   * 1. JSON.stringifies the passed variable
   * 2. Conveniently sets the Content-Type header to `application/json`
   */
  json?: any

  /**
   * Same as `body`, but:
   * 1. Transforms the passed plain js object into URLSearchParams and passes it to `body`
   * 2. Conveniently sets the Content-Type header to `application/x-www-form-urlencoded`
   */
  form?: FormData | URLSearchParams | AnyObject

  credentials?: RequestCredentials
  /**
   * Default to 'follow'.
   * 'error' would throw on redirect.
   * 'manual' will not throw, but return !ok response with 3xx status.
   */
  redirect?: RequestRedirect

  // Removing RequestInit from options to simplify FetcherOptions interface.
  // Will instead only add hand-picked useful options, such as `credentials`.
  // init?: Partial<RequestInitNormalized>

  headers?: Record<string, any>
  responseType?: FetcherResponseType // default to 'json'

  searchParams?: Record<string, any>

  /**
   * Default is 2 retries (3 tries in total).
   * Pass `retry: { count: 0 }` to disable retries.
   */
  retry?: Partial<FetcherRetryOptions>

  /**
   * Defaults to false.
   * Set to true to allow retrying `post` requests.
   */
  retryPost?: boolean
  /**
   * Defaults to false.
   */
  retry3xx?: boolean
  /**
   * Defaults to false.
   */
  retry4xx?: boolean
  /**
   * Defaults to true.
   */
  retry5xx?: boolean

  jsonReviver?: Reviver

  logRequest?: boolean
  logRequestBody?: boolean
  logResponse?: boolean
  logResponseBody?: boolean
  /**
   * If true - enables all possible logging.
   */
  debug?: boolean

  /**
   * If provided - will be used instead of `globalThis.fetch`.
   * Can be used e.g to pass a `fetch` function from `undici` (in Node.js).
   *
   * This function IS called from `Fetcher.callNativeFetch`, so
   * when `callNativeFetch` is mocked - fetchFn is NOT called.
   */
  fetchFn?: FetchFunction

  /**
   * Allows to provide a fetch function that is NOT mocked by `Fetcher.callNativeFetch`.
   *
   * By default - consider `fetchFn`, that's what you would need most of the time.
   *
   * If you want to pass a fetch function that is NOT mockable - use `overrideFetchFn`.
   * Example of where it is useful: in backend resourceTestService, which still needs to call
   * native fetch, while allowing unit tests' fetch calls to be mocked.
   */
  overrideFetchFn?: FetchFunction

  /**
   * Default to true.
   * Set to false to not throw on `!Response.ok`, but simply return `Response.body` as-is (json parsed, etc).
   */
  throwHttpErrors?: boolean

  /**
   * If Fetcher has an error - `errorData` object will be appended to the error data.
   * Like this:
   *
   * _errorDataAppend(err, cfg.errorData)
   *
   * So you, for example, can append a `fingerprint` to any error thrown from this fetcher.
   */
  errorData?: ErrorData

  /**
   * Allows to mutate the error.
   * Cannot cancel/prevent the error - AfterResponseHook can be used for that instead.
   */
  onError?: FetcherOnErrorHook

  /**
   * If provided - will be passed further to HttpRequestError if error happens,
   * allowing to construct an errorGroup/fingerprint to be able to group errors
   * related to "this type of request".
   */
  requestName?: string
}

export type RequestInitNormalized = Omit<RequestInit, 'method' | 'headers'> & {
  method: HttpMethod
  headers: Record<string, any>
  dispatcher?: Dispatcher
}

export interface FetcherSuccessResponse<BODY = unknown> {
  ok: true
  err: undefined
  fetchResponse: Response
  body: BODY
  req: FetcherRequest
  statusCode: number
  statusFamily?: HttpStatusFamily
  retryStatus: FetcherRetryStatus
  signature: string
}

export interface FetcherErrorResponse<BODY = unknown> {
  ok: false
  err: Error
  fetchResponse?: Response
  body?: BODY
  req: FetcherRequest
  statusCode?: number
  statusFamily?: HttpStatusFamily
  retryStatus: FetcherRetryStatus
  signature: string
}

export type FetcherResponse<BODY = unknown> =
  | FetcherSuccessResponse<BODY>
  | FetcherErrorResponse<BODY>

export type FetcherResponseType =
  | 'json'
  | 'text'
  | 'void'
  | 'arrayBuffer'
  | 'blob'
  | 'readableStream'

/**
 * Signature for the `fetch` function.
 * Used to be able to override and provide a different implementation,
 * e.g when mocking.
 */
export type FetchFunction = (url: string, init: RequestInit) => Promise<Response>

/**
 * A subset of RequestInit that would match both:
 *
 * 1. RequestInit from dom types
 * 2. RequestInit from undici types
 */
export interface RequestInitLike {
  method?: string
  referrer?: string
  keepalive?: boolean
}

/**
 * A subset of Response type that matches both dom and undici types.
 */
export interface ResponseLike {
  ok: boolean
  status: number
  statusText: string
}

export type GraphQLResponse<DATA> = GraphQLSuccessResponse<DATA> | GraphQLErrorResponse

export interface GraphQLSuccessResponse<DATA> {
  data: DATA
  errors: never
}

export interface GraphQLErrorResponse {
  data: never
  errors: GraphQLFormattedError[]
}

/**
 * Copy-pasted from `graphql` package, slimmed down.
 * See: https://spec.graphql.org/draft/#sec-Errors
 */
export interface GraphQLFormattedError {
  message: string
}
