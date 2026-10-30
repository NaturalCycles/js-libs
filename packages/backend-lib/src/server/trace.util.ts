import type { BackendRequest } from './server.model.js'

/**
 * The trace a request belongs to, as carried by the W3C `traceparent` header.
 */
export interface TraceContext {
  traceId: string
  spanId: string
  sampled: boolean
}

// https://www.w3.org/TR/trace-context/#traceparent-header
// Version `ff` is invalid. Higher versions may append `-` fields, which are ignored (forward
// compatibility), while version `00` must not have any.
const TRACEPARENT_REGEX = /^(?!ff)([\da-f]{2})-([\da-f]{32})-([\da-f]{16})-([\da-f]{2})(-.*)?$/
const INVALID_TRACE_ID = '0'.repeat(32)
const INVALID_SPAN_ID = '0'.repeat(16)

const traceIdByRequest = new WeakMap<BackendRequest, string | null>()

/**
 * The trace id of the request, from `traceparent`. Cached per request, so it is cheap to call on
 * every log line.
 */
export function getRequestTraceId(req: BackendRequest): string | undefined {
  return traceIdByRequest.getOrInsertComputed(req, getRequestTraceIdOrNull) ?? undefined
}

// Passed by reference, so the per-log-line call allocates no closure
function getRequestTraceIdOrNull(req: BackendRequest): string | null {
  return getRequestTraceContext(req)?.traceId ?? null
}

export function getRequestTraceContext(req: BackendRequest): TraceContext | undefined {
  // Reads from `req.headers` and not `req.header()`, so a bare request object (as in tests) works too
  const header = req.headers?.['traceparent']
  return parseTraceparent(typeof header === 'string' ? header : undefined)
}

export function parseTraceparent(header: string | undefined): TraceContext | undefined {
  const match = header ? TRACEPARENT_REGEX.exec(header) : null
  if (!match) return
  const [, version, traceId, spanId, flags, extension] = match as unknown as [
    string,
    string,
    string,
    string,
    string,
    string?,
  ]
  if (version === '00' && extension !== undefined) return
  if (traceId === INVALID_TRACE_ID || spanId === INVALID_SPAN_ID) return
  return { traceId, spanId, sampled: Number.parseInt(flags, 16) % 2 === 1 }
}
