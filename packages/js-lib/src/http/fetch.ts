/// <reference lib="dom" preserve="true" />

import type { HttpRequestErrorData } from '../error/error.model.js'
import type { NumberOfMilliseconds } from '../types.js'
import type { HttpMethod } from './http.model.js'

/**
 * Minimal wrapper around native `fetch`:
 *
 * - returns json output via Promise
 * - throws FetchError (a plain Error with `cause` and `data`) if anything goes wrong
 * - retries 2 times with simple non-configurable exponential back-off
 *
 * For anything more complex - use the Fetcher.
 * Use this wrapper for the simplest use cases, and where bundle size matters.
 */
export async function _fetch<T = unknown>(url: string, opt: FetchOptions = {}): Promise<T> {
  const { method = 'GET', timeout = 30_000, json, ...init } = opt
  if (json !== undefined) {
    init.body = JSON.stringify(json)
    init.headers = { 'content-type': 'application/json', ...init.headers }
  }
  let res: Response | undefined
  let cause: unknown

  for (let attempt = 0; ; attempt++) {
    res = undefined
    try {
      res = await fetch(url, {
        ...init,
        method,
        // A fresh signal per attempt, as a timed-out signal stays aborted
        signal: timeout ? AbortSignal.timeout(timeout) : undefined,
      })
      if (res.ok) {
        const text = await res.text()
        return (text ? JSON.parse(text) : {}) as T
      }
      cause = await res.text()
    } catch (err) {
      // Network failure, timeout, or failure to read/parse the body
      cause = err
    }

    if (attempt === 2 || !shouldRetry(method, res)) break
    await pDelay(1000 * 2 ** attempt) // 1s, then 2s
  }

  const err: FetchError = Object.assign(
    // E.g `503 GET https://example.com/api`, or `GET https://example.com/api` on a network failure
    new Error([res?.status, method, url].filter(Boolean).join(' '), { cause }),
    { data: { responseStatusCode: res?.status || 0, requestUrl: url, requestMethod: method } },
  )
  throw err
}

/**
 * Retries network failures (including timeouts), 5xx, 408 and 429.
 * Never retries a POST.
 */
function shouldRetry(method: HttpMethod, res?: Response): boolean {
  return (
    method !== 'POST' && (!res || res.status >= 500 || res.status === 408 || res.status === 429)
  )
}

/**
 * Accepts the commonly used RequestInit options.
 * `signal` is replaced by `timeout`.
 */
export interface FetchOptions extends Pick<
  RequestInit,
  'body' | 'cache' | 'credentials' | 'keepalive' | 'redirect'
> {
  /**
   * Defaults to GET
   */
  method?: HttpMethod
  headers?: Record<string, string>
  /**
   * Request body. It's JSON.stringified, and the Content-Type header is set to `application/json`.
   * Takes precedence over `body`.
   */
  json?: any
  /**
   * Defaults to 30 seconds. 0 disables the timeout.
   * Covers the whole request, including reading the body.
   */
  timeout?: NumberOfMilliseconds
}

/**
 * Thrown by `_fetch`: a plain Error, with the response body text (or the underlying error)
 * as `cause`, and a subset of HttpRequestErrorData as `data`.
 */
export interface FetchError extends Error {
  data: Pick<HttpRequestErrorData, 'responseStatusCode' | 'requestUrl' | 'requestMethod'>
}

async function pDelay<T>(ms: NumberOfMilliseconds): Promise<void> {
  await new Promise<T>(resolve => setTimeout(resolve, ms))
}
