import { expect, test } from 'vitest'
import type { BackendRequest } from './server.model.js'
import { getRequestTraceContext, getRequestTraceId, parseTraceparent } from './trace.util.js'

const traceId = '4bf92f3577b34da6a3ce929d0e0e4736'
const spanId = '00f067aa0ba902b7'
const traceparent = `00-${traceId}-${spanId}-01`

test('parseTraceparent: parses the trace id, span id and sampled flag', () => {
  expect(parseTraceparent(traceparent)).toEqual({ traceId, spanId, sampled: true })
  expect(parseTraceparent(`00-${traceId}-${spanId}-00`)).toEqual({
    traceId,
    spanId,
    sampled: false,
  })
  expect(parseTraceparent(`01-${traceId}-${spanId}-03`)).toEqual({ traceId, spanId, sampled: true })
})

test.each([
  undefined,
  '',
  `00-${traceId}-${spanId}`,
  `00-${traceId.slice(1)}-${spanId}-01`,
  `00-${'0'.repeat(32)}-${spanId}-01`,
  `00-${traceId}-${'0'.repeat(16)}-01`,
  `00-${traceId.toUpperCase()}-${spanId}-01`,
  `ff-${traceId}-${spanId}-01`,
])('parseTraceparent: rejects %s', header => {
  expect(parseTraceparent(header)).toBeUndefined()
})

test('getRequestTraceContext: reads traceparent only', () => {
  expect(getRequestTraceContext(mockReq({ traceparent }))).toEqual({
    traceId,
    spanId,
    sampled: true,
  })
  expect(
    getRequestTraceContext(mockReq({ 'x-cloud-trace-context': `${traceId}/1;o=1` })),
  ).toBeUndefined()
})

test('getRequestTraceId: prefers traceparent over x-cloud-trace-context', () => {
  expect(
    getRequestTraceId(mockReq({ traceparent, 'x-cloud-trace-context': `${'a'.repeat(32)}/1` })),
  ).toBe(traceId)
})

test.each([`${traceId}/1;o=1`, `${traceId};o=0`, traceId])(
  'getRequestTraceId: falls back to x-cloud-trace-context %s',
  header => {
    expect(
      getRequestTraceId(mockReq({ traceparent: 'not-a-trace', 'x-cloud-trace-context': header })),
    ).toBe(traceId)
  },
)

test('getRequestTraceId: undefined without a valid trace header', () => {
  expect(getRequestTraceId(mockReq({}))).toBeUndefined()
  expect(getRequestTraceId(mockReq({ 'x-cloud-trace-context': 'nope' }))).toBeUndefined()
  expect(
    getRequestTraceId(mockReq({ 'x-cloud-trace-context': `${'0'.repeat(32)}/1` })),
  ).toBeUndefined()
})

test('getRequestTraceId: is cached per request', () => {
  const req = mockReq({ traceparent })

  expect(getRequestTraceId(req)).toBe(traceId)
  req.headers['traceparent'] = `00-${'b'.repeat(32)}-${spanId}-01`
  expect(getRequestTraceId(req)).toBe(traceId)
})

function mockReq(headers: Record<string, string>): BackendRequest {
  return { headers } as any
}
