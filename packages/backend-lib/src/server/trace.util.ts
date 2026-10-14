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
// version `ff` is invalid by the spec, any other version is parsed like version 00
const TRACEPARENT_REGEX = /^(?!ff)[\da-f]{2}-([\da-f]{32})-([\da-f]{16})-([\da-f]{2})$/
// https://cloud.google.com/trace/docs/trace-context#legacy-http-header
const CLOUD_TRACE_ID_REGEX = /^([\da-f]{32})(?:\/|;|$)/
const INVALID_TRACE_ID = '0'.repeat(32)
const INVALID_SPAN_ID = '0'.repeat(16)

const traceIdByRequest = new WeakMap<BackendRequest, string | null>()

/**
 * The trace id of the request, from `traceparent`, with GCP's legacy `x-cloud-trace-context` as
 * fallback (GCP sends both, with the same id). Cached per request, so it is cheap to call on every
 * log line.
 */
export function getRequestTraceId(req: BackendRequest): string | undefined {
  let traceId = traceIdByRequest.get(req)
  if (traceId === undefined) {
    traceId = getRequestTraceContext(req)?.traceId ?? getCloudTraceId(req) ?? null
    traceIdByRequest.set(req, traceId)
  }
  return traceId ?? undefined
}

export function getRequestTraceContext(req: BackendRequest): TraceContext | undefined {
  return parseTraceparent(headerValue(req, 'traceparent'))
}

export function parseTraceparent(header: string | undefined): TraceContext | undefined {
  const match = header ? TRACEPARENT_REGEX.exec(header) : null
  if (!match) return
  const [, traceId, spanId, flags] = match as unknown as [string, string, string, string]
  if (traceId === INVALID_TRACE_ID || spanId === INVALID_SPAN_ID) return
  return { traceId, spanId, sampled: Number.parseInt(flags, 16) % 2 === 1 }
}

function getCloudTraceId(req: BackendRequest): string | undefined {
  const header = headerValue(req, 'x-cloud-trace-context')
  const traceId = header && CLOUD_TRACE_ID_REGEX.exec(header)?.[1]
  return traceId && traceId !== INVALID_TRACE_ID ? traceId : undefined
}

// Reads from `req.headers` and not `req.header()`, so a bare request object (as in tests) works too
function headerValue(req: BackendRequest, name: string): string | undefined {
  const value = req.headers?.[name]
  return typeof value === 'string' ? value : undefined
}
