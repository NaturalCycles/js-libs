// @vitest-environment happy-dom

import type { AnalyticsClientEvent, AnalyticsBatchInput } from '@naturalcycles/js-lib/analytics'
import type { AppError } from '@naturalcycles/js-lib/error'
import type { UnixTimestampMillis } from '@naturalcycles/js-lib/types'
import type { Mock } from 'vitest'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { AnalyticsClientCfg, AnalyticsEventListener } from './analyticsClient.js'
import { AnalyticsClient } from './analyticsClient.js'

const url = 'https://api.test/web/e'
const firstTouchUrl = 'https://api.test/web/ft'
const clients: AnalyticsClient[] = []
let fetchMock: Mock<FetchFn>

// Any allow-listed client id of the destination; NC's ClientId.NCWeb in the original suite
const CLIENT_ID = 1
const DEVICE_ID = '0d4b25ab-9410-4b26-b214-a0d94b58e7c9'
const DISTINCT_ID = `$device:${DEVICE_ID}`

beforeEach(() => {
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(DEVICE_ID)
  vi.useFakeTimers()
  localStorage.clear()
  fetchMock = vi.fn<FetchFn>(async () => okResponse())
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  // The CORS "simple request" guarantee is enforced on every request of every
  // test: any change that would silently introduce a preflight OPTIONS (a custom header,
  // PUT, application/json, ...) fails the suite.
  for (const [, init] of fetchMock.mock.calls) {
    assertCorsSimpleRequest(init)
  }
  clients.forEach(c => c.destroy())
  clients.length = 0
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

test('requests are CORS "simple requests" - no preflight, on any send path', async () => {
  const client = createClient()
  client.track('Event A')
  await vi.advanceTimersByTimeAsync(5000) // regular interval flush
  client.track('Event B')
  globalThis.dispatchEvent(new Event('pagehide')) // unload flush

  expect(fetchMock).toHaveBeenCalledTimes(2)
  for (const [, init] of fetchMock.mock.calls) {
    assertCorsSimpleRequest(init)
  }
})

test('batches multiple events into a single request on the flush interval', async () => {
  const client = createClient()
  client.track('Event A', { foo: 1 })
  client.track('Event B')
  client.track('Event C')
  expect(fetchMock).not.toHaveBeenCalled()

  await vi.advanceTimersByTimeAsync(5000)
  expect(fetchMock).toHaveBeenCalledTimes(1)

  const [calledUrl, init] = fetchMock.mock.calls[0]!
  expect(calledUrl).toBe(url)
  expect(init.method).toBe('POST')
  expect(init.keepalive).toBeUndefined()
  expect(init.headers).toEqual({ 'content-type': 'text/plain' })

  const body = requestBody(0)
  expect(body.sentAt).toBeGreaterThan(0)
  expect(body.clientId).toBe(CLIENT_ID)
  expect(body.events.map(e => e.name)).toEqual(['Event A', 'Event B', 'Event C'])
  expect(new Set(body.events.map(e => e.id)).size).toBe(3)
  expect(body.events[0]!.props!['foo']).toBe(1)
  expect(body.events[0]!.ts).toBeLessThanOrEqual(body.sentAt)
})

test('flushes early when maxBatchSize is reached', async () => {
  const client = createClient({ maxBatchSize: 2 })
  client.track('Event A')
  client.track('Event B')
  await vi.advanceTimersByTimeAsync(0)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(requestBody(0).events).toHaveLength(2)
})

test('merges commonProps with per-call props, per-call props win', async () => {
  const client = createClient({
    getCommonProps: () => ({ app: 'web', shared: 'common' }),
  })
  client.track('Event', { shared: 'call' })
  await vi.advanceTimersByTimeAsync(5000)
  expect(requestBody(0).events[0]!.props).toMatchObject({ app: 'web', shared: 'call' })
})

test('adds raw browser, acquisition, referrer and SDK props for backend enrichment', async () => {
  vi.stubGlobal(
    'location',
    new URL('https://www.example.com/page?utm_source=google&utm_campaign=spring&gclid=click-1'),
  )
  vi.stubGlobal('screen', { height: 1080, width: 1920 })
  vi.spyOn(document, 'referrer', 'get').mockReturnValue('https://www.google.com/search?q=widgets')

  const client = createClient()
  client.track('Event')
  await vi.advanceTimersByTimeAsync(5000)

  expect(requestBody(0).events[0]!.props).toMatchObject({
    current_url: 'https://www.example.com/page?utm_source=google&utm_campaign=spring&gclid=click-1',
    screen_height: 1080,
    screen_width: 1920,
    referrer: 'https://www.google.com/search?q=widgets',
    initial_referrer: 'https://www.google.com/search?q=widgets',
    utm_source: 'google',
    utm_campaign: 'spring',
    gclid: 'click-1',
  })
  expect(requestBody(0).userId).toBe(DISTINCT_ID)
  expect(requestBody(0).events[0]!.props).not.toHaveProperty('$browser')
  expect(requestBody(0).events[0]!.props).not.toHaveProperty('$search_engine')
})

test('should persist the initial referrer and canonical utms, not click ids or other utms', async () => {
  let referrer = 'https://partner.example/landing'
  vi.spyOn(document, 'referrer', 'get').mockImplementation(() => referrer)
  vi.stubGlobal(
    'location',
    new URL('https://www.example.com/?utm_source=partner&utm_custom=abc&fbclid=click-1'),
  )
  const client = createClient()
  client.track('First')

  referrer = ''
  vi.stubGlobal('location', new URL('https://www.example.com/next'))
  client.track('Second')
  await vi.advanceTimersByTimeAsync(5000)

  const secondProps = requestBody(0).events[1]!.props!
  expect(secondProps['initial_referrer']).toBe('https://partner.example/landing')
  expect(secondProps['utm_source']).toBe('partner')
  expect(secondProps['utm_custom']).toBeUndefined()
  expect(secondProps['fbclid']).toBeUndefined()
})

test('init() registers the acquisition props eagerly, from the landing url', async () => {
  vi.spyOn(document, 'referrer', 'get').mockReturnValue('https://partner.example/landing')
  vi.stubGlobal('location', new URL('https://www.example.com/?utm_source=partner'))
  const client = createClient()
  client.init()

  // An SPA navigation strips the utms off the url before the first event fires -
  // without init() the landing utms would be lost
  vi.spyOn(document, 'referrer', 'get').mockReturnValue('')
  vi.stubGlobal('location', new URL('https://www.example.com/next'))
  client.track('Event')
  await vi.advanceTimersByTimeAsync(5000)

  const props = requestBody(0).events[0]!.props!
  expect(props['initial_referrer']).toBe('https://partner.example/landing')
  expect(props['utm_source']).toBe('partner')
})

test('init() does not touch the identity entry when disabled', () => {
  const client = createClient({ isEnabled: () => false })
  client.init()
  expect(localStorage).toHaveLength(0)
})

test('sends long names and string properties untruncated', async () => {
  const client = createClient()
  client.track('N'.repeat(300), {
    direct: 'D'.repeat(300),
    nested: { array: ['A'.repeat(300)] },
  })
  await vi.advanceTimersByTimeAsync(5000)

  const event = requestBody(0).events[0]!
  expect(event.name).toHaveLength(300)
  expect(event.props!['direct']).toHaveLength(300)
  expect((event.props!['nested'] as { array: string[] }).array[0]).toHaveLength(300)
})

test('replaces circular property references instead of throwing', async () => {
  const client = createClient()
  const circular: Record<string, unknown> = { name: 'node' }
  circular['self'] = circular
  // The same object referenced by two siblings is not a cycle and must survive intact
  const shared = { id: 1 }
  client.track('Event', { circular, first: shared, second: shared })
  await vi.advanceTimersByTimeAsync(5000)

  const props = requestBody(0).events[0]!.props!
  expect((props['circular'] as Record<string, unknown>)['self']).toMatch(/^\[Circular ~/)
  expect(props['first']).toEqual({ id: 1 })
  expect(props['second']).toEqual({ id: 1 })
})

test('drops events when isEnabled returns false', async () => {
  const client = createClient({ isEnabled: () => false })
  client.track('Event')
  await vi.advanceTimersByTimeAsync(10_000)
  expect(fetchMock).not.toHaveBeenCalled()
  expect(localStorage).toHaveLength(0)
})

test('retries 5xx with exponential backoff, preserving event ids', async () => {
  fetchMock
    .mockResolvedValueOnce(new Response('', { status: 500 }))
    .mockResolvedValueOnce(new Response('', { status: 503 }))
    .mockResolvedValue(okResponse())
  const client = createClient()
  client.track('Event')

  await vi.advanceTimersByTimeAsync(5000) // attempt 1 fails
  expect(fetchMock).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(9999) // backoff of 10s not elapsed yet
  expect(fetchMock).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(1) // attempt 2 fails
  expect(fetchMock).toHaveBeenCalledTimes(2)
  await vi.advanceTimersByTimeAsync(20_000) // attempt 3 succeeds
  expect(fetchMock).toHaveBeenCalledTimes(3)

  const ids = fetchMock.mock.calls.map((_, i) => requestBody(i).events[0]!.id)
  expect(new Set(ids).size).toBe(1)

  // queue is drained - no further requests
  await vi.advanceTimersByTimeAsync(60_000)
  expect(fetchMock).toHaveBeenCalledTimes(3)
})

test('retries network errors', async () => {
  fetchMock.mockRejectedValueOnce(new TypeError('network down')).mockResolvedValue(okResponse())
  const client = createClient()
  client.track('Event')
  await vi.advanceTimersByTimeAsync(5000)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(10_000)
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

test('drops the batch on non-retryable 4xx', async () => {
  fetchMock.mockResolvedValueOnce(new Response('', { status: 400 })).mockResolvedValue(okResponse())
  const client = createClient()
  client.track('Bad')
  await vi.advanceTimersByTimeAsync(5000)
  client.track('Good')
  await vi.advanceTimersByTimeAsync(5000)
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(requestBody(1).events.map(e => e.name)).toEqual(['Good'])
})

test('should call onError when a batch is dropped on a 400', async () => {
  fetchMock.mockResolvedValueOnce(new Response('', { status: 400 })).mockResolvedValue(okResponse())
  const onError = vi.fn<(err: unknown) => void>()
  const client = createClient({ onError })
  client.track('Bad')
  await vi.advanceTimersByTimeAsync(5000)

  expect(onError).toHaveBeenCalledTimes(1)
  const err = onError.mock.calls[0]![0] as AppError
  expect(err.message).toMatch(/dropped/)
  expect(err.data['status']).toBe(400)
})

test('should not call onError on a retryable 5xx', async () => {
  fetchMock.mockResolvedValueOnce(new Response('', { status: 500 })).mockResolvedValue(okResponse())
  const onError = vi.fn<(err: unknown) => void>()
  const client = createClient({ onError })
  client.track('Event')
  await vi.advanceTimersByTimeAsync(5000) // attempt 1 fails, retried
  await vi.advanceTimersByTimeAsync(10_000) // attempt 2 succeeds

  expect(onError).not.toHaveBeenCalled()
})

test('drops the oldest events when the queue is full', async () => {
  const client = createClient({ maxQueueSize: 3, flushInterval: 60_000 })
  for (const name of ['A', 'B', 'C', 'D']) client.track(name)
  await vi.advanceTimersByTimeAsync(60_000)
  expect(requestBody(0).events.map(e => e.name)).toEqual(['B', 'C', 'D'])
})

test('generates a stable distinctId, supports identify() and reset()', async () => {
  const client = createClient()
  const id = client.identity.getDistinctId()
  expect(id).toBe(DISTINCT_ID) // anonymous identity
  expect(createClient().identity.getDistinctId()).toBe(id) // persisted across instances

  client.identify('user-123')
  client.track('Event')
  await vi.advanceTimersByTimeAsync(5000)
  expect(requestBody(0).userId).toBe('user-123')

  client.track('Discarded by reset')
  client.reset()
  const newUserId = client.identity.getDistinctId()
  expect(newUserId).not.toBe('user-123')
  client.track('After reset')
  await vi.advanceTimersByTimeAsync(5000)
  const lastRequest = requestBody(fetchMock.mock.calls.length - 1)
  expect(lastRequest.userId).toBe(newUserId)
  expect(lastRequest.events.map(event => event.name)).toEqual(['After reset'])
})

test('should put the identity it was tracked under into each event', async () => {
  const client = createClient()
  const anonDistinctId = client.identity.getDistinctId()
  client.track('Event')
  client.identify('user-b')

  await vi.advanceTimersByTimeAsync(5000)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(requestBody(0).events.map(event => [event.name, event.userId])).toEqual([
    ['Event', anonDistinctId],
    ['identify', 'user-b'],
  ])
  expect(requestBody(0).userId).toBe('user-b')
})

test('should emit the identify event naming the previous anonymous distinct id', async () => {
  const client = createClient()
  const anonDistinctId = client.identity.getDistinctId()
  expect(anonDistinctId).toBe(DISTINCT_ID)

  client.identify('user-123')
  await vi.advanceTimersByTimeAsync(5000)

  expect(requestBody(0).userId).toBe('user-123')
  const identifyEvent = requestBody(0).events.find(event => event.name === 'identify')
  expect(identifyEvent?.props?.['anon_distinct_id']).toBe(anonDistinctId)
})

test('should not re-emit the identify event for an unchanged identity', async () => {
  const client = createClient()
  client.identify('user-123')
  client.identify('user-123')

  await vi.advanceTimersByTimeAsync(5000)
  const names = requestBody(0).events.map(event => event.name)
  expect(names.filter(name => name === 'identify')).toHaveLength(1)
})

test('reset() clears the acquisition props and re-registers them on the next event', async () => {
  vi.spyOn(document, 'referrer', 'get').mockReturnValue('https://partner.example/landing')
  const client = createClient()
  client.track('Before')
  client.reset() // wipes the identity entry, including initial_referrer

  vi.spyOn(document, 'referrer', 'get').mockReturnValue('')
  client.track('After')
  await vi.advanceTimersByTimeAsync(5000)
  expect(requestBody(0).events.map(event => event.name)).toEqual(['After'])
  expect(requestBody(0).events[0]!.props!['initial_referrer']).toBeNull()
})

test('splits batches by serialized UTF-8 byte size', async () => {
  const client = createClient({ maxBatchBytes: 3000 })
  const props = { chunks: Array.from({ length: 6 }, () => 'x'.repeat(255)) }
  client.track('Event A', props)
  client.track('Event B', props)

  await vi.advanceTimersByTimeAsync(5000)
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(requestBody(0).events.map(event => event.name)).toEqual(['Event A'])
  expect(requestBody(1).events.map(event => event.name)).toEqual(['Event B'])
  for (const [, init] of fetchMock.mock.calls) {
    expect(new TextEncoder().encode(init.body as string).byteLength).toBeLessThanOrEqual(3000)
  }
})

test('sends an event larger than maxBatchBytes as its own regular batch', async () => {
  const client = createClient({ maxBatchBytes: 3000 })
  client.track('Oversized', { chunks: Array.from({ length: 20 }, () => 'x'.repeat(255)) })
  client.track('Valid')

  await vi.advanceTimersByTimeAsync(5000)
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(requestBody(0).events.map(event => event.name)).toEqual(['Oversized'])
  expect(
    new TextEncoder().encode(fetchMock.mock.calls[0]![1].body as string).byteLength,
  ).toBeGreaterThan(3000)
  expect(requestBody(1).events.map(event => event.name)).toEqual(['Valid'])
})

test('flushes with keepalive on pagehide and retains the durable queue for regular retry', async () => {
  const client = createClient()
  client.track('Event A')
  client.track('Event B')
  globalThis.dispatchEvent(new Event('pagehide'))
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock.mock.calls[0]![1].keepalive).toBe(true)
  expect(requestBody(0).events).toHaveLength(2)
  expect(persistedQueueKeys()).toHaveLength(1)

  client.destroy()
  createClient()
  await vi.advanceTimersByTimeAsync(5000)
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock.mock.calls[1]![1].keepalive).toBeUndefined()
  expect(requestBody(1).events.map(event => event.name)).toEqual(['Event A', 'Event B'])
  expect(persistedQueueKeys()).toEqual([])
})

test('flushNow() delivers late lifecycle events with keepalive', async () => {
  const client = createClient()
  globalThis.dispatchEvent(new Event('pagehide')) // nothing queued - no request
  expect(fetchMock).not.toHaveBeenCalled()

  client.track('Late event') // e.g tracked by an app-level pagehide handler
  client.flushNow()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock.mock.calls[0]![1].keepalive).toBe(true)
  expect(requestBody(0).events.map(event => event.name)).toEqual(['Late event'])
})

test('retains lifecycle events when the server rejects the keepalive request', async () => {
  fetchMock.mockResolvedValueOnce(new Response('', { status: 500 })).mockResolvedValue(okResponse())
  const client = createClient()
  client.track('Event')
  globalThis.dispatchEvent(new Event('pagehide'))
  await vi.advanceTimersByTimeAsync(0)
  expect(persistedQueueKeys()).toHaveLength(1)

  client.destroy()
  createClient()
  await vi.advanceTimersByTimeAsync(5000)
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(requestBody(1).events.map(event => event.name)).toEqual(['Event'])
  expect(persistedQueueKeys()).toEqual([])
})

test('restores events persisted by a previous pageload', async () => {
  const clientA = createClient({ flushInterval: 60_000 })
  clientA.track('Orphan')
  clientA.destroy() // simulates a killed tab: queue snapshot stays in localStorage

  createClient()
  await vi.advanceTimersByTimeAsync(5000)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  const body = requestBody(0)
  expect(body.events.map(e => e.name)).toEqual(['Orphan'])
  expect(body.events[0]!.ts).toBeLessThanOrEqual(body.sentAt)
})

test('discards persisted events older than maxPersistedAgeMs', async () => {
  const staleEvent: AnalyticsClientEvent = {
    id: 'stale-id',
    name: 'Stale',
    ts: (Date.now() - 25 * 3_600_000) as UnixTimestampMillis,
    props: {},
  }
  const freshEvent: AnalyticsClientEvent = {
    ...staleEvent,
    id: 'fresh-id',
    name: 'Fresh',
    ts: (Date.now() - 3_600_000) as UnixTimestampMillis,
  }
  localStorage.setItem('nca.q.deadtab', JSON.stringify([staleEvent, freshEvent]))

  createClient()
  await vi.advanceTimersByTimeAsync(5000)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(requestBody(0).events.map(e => e.name)).toEqual(['Fresh'])
  expect(localStorage.getItem('nca.q.deadtab')).toBeNull()
})

describe('onEvent', () => {
  test('should call the listener with the tracked event and the identity distinctId', () => {
    const client = createClient({ isEnabled: () => true })
    const listener = vi.fn<AnalyticsEventListener>()
    client.onEvent(listener)

    client.track('Click', { element: 'cta' })

    expect(listener).toHaveBeenCalledTimes(1)
    const [event, distinctId] = listener.mock.calls[0]!
    expect(event.name).toBe('Click')
    expect(event.props).toMatchObject({ element: 'cta' })
    expect(typeof event.id).toBe('string')
    expect(distinctId).toBe(client.identity.getDistinctId())
  })

  test('should not call the listener for the identify identity event', async () => {
    const client = createClient({ isEnabled: () => true })
    const listener = vi.fn<AnalyticsEventListener>()
    client.onEvent(listener)

    client.track('Click')
    client.identify('user-123')

    await vi.advanceTimersByTimeAsync(5000)
    expect(requestBody(0).events.map(event => event.name)).toContain('identify')
    expect(listener.mock.calls.map(([event]) => event.name)).toEqual(['Click'])
  })

  test('should not call the listener when isEnabled returns false', () => {
    const client = createClient({ isEnabled: () => false })
    const listener = vi.fn<AnalyticsEventListener>()
    client.onEvent(listener)

    client.track('Click')

    expect(listener).not.toHaveBeenCalled()
  })

  test('should call the listener once per event', () => {
    const client = createClient({ isEnabled: () => true })
    const listener = vi.fn<AnalyticsEventListener>()
    client.onEvent(listener)

    client.track('A')
    client.track('B')

    expect(listener).toHaveBeenCalledTimes(2)
  })

  test('should stop calling the listener after unsubscribe', () => {
    const client = createClient({ isEnabled: () => true })
    const listener = vi.fn<AnalyticsEventListener>()
    const unsubscribe = client.onEvent(listener)

    unsubscribe()
    client.track('A')

    expect(listener).not.toHaveBeenCalled()
  })

  test('should swallow a throwing listener and keep notifying the rest', () => {
    const client = createClient({ isEnabled: () => true })
    const throwing = vi.fn<AnalyticsEventListener>(() => {
      throw new Error('boom')
    })
    const listener = vi.fn<AnalyticsEventListener>()
    client.onEvent(throwing)
    client.onEvent(listener)

    expect(() => client.track('A')).not.toThrow()

    expect(throwing).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  test('should give listeners a snapshot that cannot mutate the delivered event', async () => {
    const client = createClient({ isEnabled: () => true })
    client.onEvent(event => {
      event.name = 'MUTATED'
      event.props!['injected'] = true
    })

    client.track('Click', { element: 'cta' })
    await vi.advanceTimersByTimeAsync(5000)

    const delivered = requestBody(0).events[0]!
    expect(delivered.name).toBe('Click')
    expect(delivered.props).not.toHaveProperty('injected')
  })
})

test('should post the first touch again on identify()', async () => {
  vi.spyOn(document, 'referrer', 'get').mockReturnValue('https://partner.example/landing')

  const client = createClient({ firstTouchUrl })
  client.track('Event')
  client.identify('user-123')
  await vi.advanceTimersByTimeAsync(5000)

  // The destination does not move profile props from the anonymous id onto the identified one
  const bodies = fetchMock.mock.calls
    .filter(([u]) => u === firstTouchUrl)
    .map(([, init]) => JSON.parse(init.body as string))
  expect(bodies.map(b => b.userId)).toEqual([DISTINCT_ID, 'user-123'])
})

test('should post the first touch to its own endpoint, once per pageload', async () => {
  vi.stubGlobal('location', new URL('https://www.example.com/?utm_source=google'))
  vi.spyOn(document, 'referrer', 'get').mockReturnValue('https://partner.example/landing')

  const client = createClient({ firstTouchUrl })
  client.track('Event A')
  client.track('Event B')
  await vi.advanceTimersByTimeAsync(5000)

  const calls = fetchMock.mock.calls.filter(([u]) => u === firstTouchUrl)
  expect(calls).toHaveLength(1)
  expect(JSON.parse(calls[0]![1].body as string)).toMatchObject({
    clientId: CLIENT_ID,
    userId: DISTINCT_ID,
    props: {
      initial_referrer: 'https://partner.example/landing',
      initial_utm_source: 'google',
      initial_utm_medium: null,
    },
  })
})

test('should replay the calls a stub recorded, under their original timestamps', async () => {
  const trackedAt = (Date.now() - 60_000) as UnixTimestampMillis
  vi.stubGlobal('analyticsClient', {
    q: [{ method: 'track', args: ['Click', { element: 'cta' }], ts: trackedAt }],
  })
  const client = createClient()

  client.init()
  await vi.advanceTimersByTimeAsync(5000)

  const [event] = requestBody(0).events
  expect(event!.name).toBe('Click')
  expect(event!.ts).toBe(trackedAt)
  expect(event!.props).toMatchObject({ element: 'cta' })
})

test('should keep the anonymous identity for calls the stub recorded before its identify', async () => {
  vi.stubGlobal('analyticsClient', {
    q: [
      { method: 'track', args: ['Click'], ts: Date.now() as UnixTimestampMillis },
      { method: 'identify', args: ['user-123'], ts: Date.now() as UnixTimestampMillis },
      { method: 'track', args: ['Click'], ts: Date.now() as UnixTimestampMillis },
    ],
  })
  const client = createClient()

  client.init()
  await vi.advanceTimersByTimeAsync(5000)

  // identify() flushes, and its own event already belongs to the new identity
  expect(requestBody(0).events.map(e => e.userId)).toEqual([DISTINCT_ID, 'user-123'])
  expect(requestBody(1).events.map(e => e.userId)).toEqual(['user-123'])
})

test('should drain the stub, so a second init() cannot deliver its calls twice', async () => {
  const stub = { q: [{ method: 'track', args: ['Click'], ts: Date.now() as UnixTimestampMillis }] }
  vi.stubGlobal('analyticsClient', stub)
  const client = createClient()

  client.init()
  client.init()
  await vi.advanceTimersByTimeAsync(5000)

  expect(stub.q).toHaveLength(0)
  expect(requestBody(0).events).toHaveLength(1)
})

test('should track normally when the page has no stub', async () => {
  const client = createClient()

  client.init()
  client.track('Click')
  await vi.advanceTimersByTimeAsync(5000)

  expect(requestBody(0).events.map(e => e.name)).toEqual(['Click'])
})

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS#simple_requests
const CORS_SAFELISTED_METHODS = ['GET', 'HEAD', 'POST']
const CORS_SAFELISTED_HEADERS = ['accept', 'accept-language', 'content-language', 'content-type']
const CORS_SAFELISTED_CONTENT_TYPES = [
  'text/plain',
  'application/x-www-form-urlencoded',
  'multipart/form-data',
]

function assertCorsSimpleRequest(init: RequestInit): void {
  // Only GET/HEAD/POST avoid a preflight (notably NOT PUT)
  expect(CORS_SAFELISTED_METHODS).toContain(init.method || 'GET')
  for (const [name, value] of new Headers(init.headers)) {
    // Any non-safelisted header (authorization, x-*, distinctId, ...) forces a preflight
    expect(CORS_SAFELISTED_HEADERS).toContain(name)
    if (name === 'content-type') {
      // Only these three content-types avoid a preflight (notably NOT application/json)
      expect(CORS_SAFELISTED_CONTENT_TYPES).toContain(value.split(';')[0]!.trim().toLowerCase())
    }
  }
}

function createClient(cfg?: Partial<AnalyticsClientCfg>): AnalyticsClient {
  const client = new AnalyticsClient({
    url,
    clientId: CLIENT_ID,
    logger: { ...console, warn: () => {} },
    identity: {
      persistence: 'localStorage',
      persistenceKey: 'key',
    },
    ...cfg,
  })
  clients.push(client)
  return client
}

function okResponse(): Response {
  return new Response('{}', { status: 200 })
}

function requestBody(callIndex: number): AnalyticsBatchInput {
  const [, init] = fetchMock.mock.calls[callIndex]!
  return JSON.parse(init.body as string)
}

function persistedQueueKeys(): string[] {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('nca.q.')) keys.push(key)
  }
  return keys
}

type FetchFn = (url: string, init: RequestInit) => Promise<Response>
