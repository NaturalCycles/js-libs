import type { OutgoingHttpHeader, OutgoingHttpHeaders, ServerResponse } from 'node:http'

/**
 * Invokes the listener once, right before the response writes its headers
 * (via `res.writeHead`, which is also called implicitly by the first `write`/`end`).
 *
 * Headers passed to `writeHead` are applied to `res` before the listener runs,
 * so the listener sees (and can modify) the final headers and statusCode.
 *
 * Vendored (and modernized) from the `on-headers` package.
 */
export function onHeaders(res: ServerResponse, listener: (this: ServerResponse) => void): void {
  // Loosely typed, to call it with the (statusCode, reason?) signature, bypassing overloads
  const prevWriteHead = res.writeHead as (statusCode: number, reason?: string) => ServerResponse
  let fired = false

  res.writeHead = function writeHead(
    this: ServerResponse,
    statusCode: number,
    reasonOrHeaders?: string | Headers,
    headers?: Headers,
  ) {
    if (fired) return prevWriteHead.apply(this, arguments as any)
    fired = true

    const reason = typeof reasonOrHeaders === 'string' ? reasonOrHeaders : undefined
    headers = reason === undefined ? (reasonOrHeaders as Headers | undefined) : headers

    this.statusCode = statusCode
    if (headers) setHeaders(this, headers)
    listener.call(this)

    // Reason phrase is dropped if the listener changed the statusCode
    return reason !== undefined && this.statusCode === statusCode
      ? prevWriteHead.call(this, statusCode, reason)
      : prevWriteHead.call(this, this.statusCode)
  }
}

type Headers = OutgoingHttpHeaders | OutgoingHttpHeader[]

function setHeaders(res: ServerResponse, headers: Headers): void {
  if (!Array.isArray(headers)) {
    for (const k of Object.keys(headers)) {
      if (k) res.setHeader(k, headers[k]!)
    }
    return
  }

  if (Array.isArray(headers[0])) {
    // 2D: [[k, v], [k, v]]
    for (const [k, v] of headers as unknown as [string, OutgoingHttpHeader][]) {
      if (k) res.setHeader(k, v)
    }
    return
  }

  // 1D (raw): [k, v, k, v], keys may repeat
  if (headers.length % 2) throw new TypeError('headers array is malformed')
  for (let i = 0; i < headers.length; i += 2) {
    res.removeHeader(headers[i] as string)
  }
  for (let i = 0; i < headers.length; i += 2) {
    if (headers[i]) res.appendHeader(headers[i] as string, headers[i + 1] as string | string[])
  }
}
