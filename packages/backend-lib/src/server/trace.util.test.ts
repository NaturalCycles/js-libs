import { expect, it } from 'vitest'
import type { BackendRequest } from './server.model.js'
import { getRequestTraceContext, getRequestTraceId, parseTraceparent } from './trace.util.js'

const traceId = '4bf92f3577b34da6a3ce929d0e0e4736'
const spanId = '00f067aa0ba902b7'
const traceparent = `00-${traceId}-${spanId}-01`

it('should parse the trace id, span id and sampled flag from traceparent', () => {
  expect(parseTraceparent(traceparent)).toEqual({ traceId, spanId, sampled: true })
  expect(parseTraceparent(`00-${traceId}-${spanId}-00`)).toEqual({
    traceId,
    spanId,
    sampled: false,
  })
  expect(parseTraceparent(`01-${traceId}-${spanId}-03`)).toEqual({ traceId, spanId, sampled: true })
})

it('should ignore the extra fields of a higher traceparent version', () => {
  expect(parseTraceparent(`01-${traceId}-${spanId}-01-extra`)).toEqual({
    traceId,
    spanId,
    sampled: true,
  })
})

it.each([
  undefined,
  '',
  `00-${traceId}-${spanId}`,
  `00-${traceId.slice(1)}-${spanId}-01`,
  `00-${'0'.repeat(32)}-${spanId}-01`,
  `00-${traceId}-${'0'.repeat(16)}-01`,
  `00-${traceId.toUpperCase()}-${spanId}-01`,
  `ff-${traceId}-${spanId}-01`,
  `00-${traceId}-${spanId}-01-extra`,
  `01-${traceId}-${spanId}-01extra`,
])('should reject the traceparent %s', header => {
  expect(parseTraceparent(header)).toBeUndefined()
})

it('should read the trace context from the traceparent header', () => {
  expect(getRequestTraceContext(mockReq({ traceparent }))).toEqual({
    traceId,
    spanId,
    sampled: true,
  })
  expect(getRequestTraceContext(mockReq({}))).toBeUndefined()
})

it('should return no trace id without a valid traceparent', () => {
  expect(getRequestTraceId(mockReq({}))).toBeUndefined()
  expect(getRequestTraceId(mockReq({ traceparent: 'not-a-trace' }))).toBeUndefined()
  expect(
    getRequestTraceId(mockReq({ 'x-cloud-trace-context': `${traceId}/1;o=1` })),
  ).toBeUndefined()
})

it('should cache the trace id per request', () => {
  const req = mockReq({ traceparent })

  expect(getRequestTraceId(req)).toBe(traceId)
  req.headers['traceparent'] = `00-${'b'.repeat(32)}-${spanId}-01`
  expect(getRequestTraceId(req)).toBe(traceId)
})

function mockReq(headers: Record<string, string>): BackendRequest {
  return { headers } as any
}
