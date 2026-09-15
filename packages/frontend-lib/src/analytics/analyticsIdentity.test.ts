// @vitest-environment happy-dom
// oxlint-disable unicorn/no-document-cookie

import {
  MAX_ANALYTICS_PROPERTY_LENGTH,
  CANONICAL_UTM_PARAMS,
} from '@naturalcycles/js-lib/analytics'
import type { FirstTouchUtms } from '@naturalcycles/js-lib/analytics'
import type { AppError } from '@naturalcycles/js-lib/error'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { AnalyticsIdentityCfg } from './analyticsClient.js'
import { AnalyticsClientError, AnalyticsIdentity, getCookie, setCookie } from './analyticsClient.js'

const cookieName = 'analyticsId'

const DEVICE_ID = '0d4b25ab-9410-4b26-b214-a0d94b58e7c9'
const DISTINCT_ID = `$device:${DEVICE_ID}`

beforeEach(() => {
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(DEVICE_ID)
  localStorage.clear()
  // Cookies persist between tests within the happy-dom instance - expire ours
  document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  // Back to the root path, so any path-scoped cookie stops matching
  history.pushState({}, '', '/')
})

test('should generate an identity and persist it in the cookie', () => {
  const identity = createIdentity()
  const distinctId = identity.getDistinctId()
  const deviceId = identity.getDeviceId()

  expect(distinctId).toBe(DISTINCT_ID)
  expect(deviceId).toBe(DEVICE_ID)

  expect(parseCookie()).toEqual({
    distinct_id: distinctId,
    $device_id: deviceId,
  })

  // A second instance (e.g another pageload) adopts the same identity
  expect(createIdentity().getDistinctId()).toBe(distinctId)
})

test('should adopt an identity persisted by another writer', () => {
  writeAnalyticsCookie({
    distinct_id: '$device:0d4b25ab-9410-4b26-b214-a0d94b58e7c9',
    $device_id: '0d4b25ab-9410-4b26-b214-a0d94b58e7c9',
    $initial_referrer: '$direct',
    $initial_referring_domain: '$direct',
    __mps: {},
  })

  const identity = createIdentity()
  expect(identity.getDistinctId()).toBe('$device:0d4b25ab-9410-4b26-b214-a0d94b58e7c9')
  expect(identity.getDeviceId()).toBe('0d4b25ab-9410-4b26-b214-a0d94b58e7c9')
})

test('should set distinct_id/user_id, keep $device_id and preserve unrelated properties', () => {
  writeAnalyticsCookie({
    distinct_id: '$device:0d4b25ab-9410-4b26-b214-a0d94b58e7c9',
    $device_id: '0d4b25ab-9410-4b26-b214-a0d94b58e7c9',
    $initial_referrer: 'https://google.com',
    utm_source: 'newsletter',
  })

  const identity = createIdentity()
  identity.identify('user-123')

  expect(identity.getDistinctId()).toBe('user-123')
  // Another app on a sibling subdomain reads the same identified entry,
  // and non-identity props it may have stored are not clobbered
  expect(parseCookie()).toEqual({
    distinct_id: 'user-123',
    user_id: 'user-123',
    $device_id: '0d4b25ab-9410-4b26-b214-a0d94b58e7c9',
    $initial_referrer: 'https://google.com',
    utm_source: 'newsletter',
  })
})

test('identify() backfills $device_id for legacy (pre-$device_id) identities', () => {
  // Very old entries: unprefixed distinct_id, no device id
  writeAnalyticsCookie({ distinct_id: '17f0e8f2a41234-abcdef' })

  const identity = createIdentity()
  identity.identify('user-123')

  expect(parseCookie()).toEqual({
    distinct_id: 'user-123',
    user_id: 'user-123',
    $device_id: '17f0e8f2a41234-abcdef',
  })
})

test('reset() clears the whole entry and generates a fresh identity', () => {
  writeAnalyticsCookie({
    distinct_id: 'user-123',
    user_id: 'user-123',
    $device_id: '0d4b25ab-9410-4b26-b214-a0d94b58e7c9',
    utm_source: 'newsletter',
    firstTouch: { referrer: null },
  })

  const identity = createIdentity()
  identity.reset()

  const distinctId = identity.getDistinctId()
  expect(distinctId).toBe(DISTINCT_ID)
  // Everything else stored in the entry may belong to the previous user, so it goes too
  expect(parseCookie()).toEqual({
    distinct_id: distinctId,
    $device_id: identity.getDeviceId(),
  })
})

test('refreshes the cookie expiry once per instance (sliding window)', () => {
  writeAnalyticsCookie({
    distinct_id: '$device:0d4b25ab-9410-4b26-b214-a0d94b58e7c9',
    $device_id: '0d4b25ab-9410-4b26-b214-a0d94b58e7c9',
  })
  const cookieSetter = vi.spyOn(document, 'cookie', 'set')

  const identity = createIdentity()
  identity.getDistinctId()
  identity.getDistinctId()
  identity.getDeviceId()

  // A single re-save, with an expiration date
  expect(cookieSetter).toHaveBeenCalledTimes(1)
  expect(cookieSetter.mock.calls[0]![0]).toContain('; expires=')
})

test('localStorage persistence stores the same entry format', () => {
  const identity = createIdentity({ persistence: 'localStorage', persistenceKey: 'nca.identity' })
  const distinctId = identity.getDistinctId()

  expect(distinctId).toBe(DISTINCT_ID)
  // Raw (not URL-encoded) JSON
  expect(JSON.parse(localStorage.getItem('nca.identity')!)).toEqual({
    distinct_id: distinctId,
    $device_id: identity.getDeviceId(),
  })
  expect(
    createIdentity({
      persistence: 'localStorage',
      persistenceKey: 'nca.identity',
    }).getDistinctId(),
  ).toBe(distinctId)
})

test('falls back to a stable in-memory identity when storage is unavailable', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })

  const identity = createIdentity({ persistence: 'localStorage', persistenceKey: 'nca.identity' })
  const distinctId = identity.getDistinctId()
  expect(distinctId).toBe(DISTINCT_ID)
  expect(identity.getDistinctId()).toBe(distinctId) // stable within the session

  identity.identify('user-123')
  expect(identity.getDistinctId()).toBe('user-123')
})

test('should maintain the acquisition props at init', () => {
  writeAnalyticsCookie({
    distinct_id: '$device:0d4b25ab-9410-4b26-b214-a0d94b58e7c9',
    $device_id: '0d4b25ab-9410-4b26-b214-a0d94b58e7c9',
  })
  vi.stubGlobal(
    'location',
    new URL(
      'https://www.example.com/?utm_source=google&utm_campaign=spring&utm_custom=abc&fbclid=click-1',
    ),
  )
  vi.spyOn(document, 'referrer', 'get').mockReturnValue('https://www.google.com/search?q=widgets')

  createIdentity().updateAcquisitionProps()

  // First-touch initial_referrer and last-touch utm_* (and only those) are registered -
  // click ids like fbclid are deliberately not persisted, and the derived props
  // the derived props ($initial_referring_domain, $search_engine, mp_keyword) are not
  // maintained: the server derives them from the raw values
  expect(parseCookie()).toEqual({
    distinct_id: '$device:0d4b25ab-9410-4b26-b214-a0d94b58e7c9',
    $device_id: '0d4b25ab-9410-4b26-b214-a0d94b58e7c9',
    utm_source: 'google',
    utm_campaign: 'spring',
    firstTouch: {
      referrer: 'https://www.google.com/search?q=widgets',
      utms: mockFirstTouchUtms({ initial_utm_source: 'google', initial_utm_campaign: 'spring' }),
    },
  })
})

test('should record the current referrer as first touch when only a legacy prop exists', () => {
  writeAnalyticsCookie({
    $initial_referrer: 'https://partner.example/landing',
    $initial_referring_domain: 'partner.example',
    utm_source: 'partner',
    utm_campaign: 'spring',
  })
  vi.stubGlobal('location', new URL('https://www.example.com/?utm_source=newsletter'))
  vi.spyOn(document, 'referrer', 'get').mockReturnValue('https://www.example.com/page')

  const identity = createIdentity()
  identity.updateAcquisitionProps()

  expect(parseCookie()).toEqual({
    $initial_referrer: 'https://partner.example/landing',
    $initial_referring_domain: 'partner.example',
    utm_source: 'newsletter', // last touch wins
    utm_campaign: 'spring', // kept until overwritten
    firstTouch: {
      referrer: 'https://www.example.com/page',
      utms: mockFirstTouchUtms({ initial_utm_source: 'newsletter' }),
    },
  })
  expect(identity.getProperty('utm_source')).toBe('newsletter')
})

test('getAcquisitionProps returns only the event-relevant subset of the entry', () => {
  writeAnalyticsCookie({
    distinct_id: '$device:0d4b25ab-9410-4b26-b214-a0d94b58e7c9',
    $device_id: '0d4b25ab-9410-4b26-b214-a0d94b58e7c9',
    firstTouch: { referrer: 'https://www.google.com/search?q=widgets' },
    $initial_referring_domain: 'www.google.com',
    $search_engine: 'google',
    mp_keyword: 'widgets',
    utm_source: 'google',
    utm_custom: 'abc',
    __mps: {},
  })

  // $initial_referring_domain / $search_engine / mp_keyword stay behind:
  // the Backend derives them from the raw values
  expect(createIdentity().getAcquisitionProps()).toEqual({
    initial_referrer: 'https://www.google.com/search?q=widgets',
    utm_source: 'google',
    utm_custom: 'abc',
  })
})

test('should mark direct traffic', () => {
  vi.stubGlobal('location', new URL('https://www.example.com/'))

  createIdentity().updateAcquisitionProps()

  expect(parseCookie()).toEqual({
    firstTouch: { referrer: null },
  })
})

test('should write the expected cookie attributes', () => {
  const cookie = setCookie('name', 'va lue', 365, '.example.com', true)
  expect(cookie).toBe(
    `name=va%20lue; expires=${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()}; path=/; domain=.example.com; secure`,
  )
})

test('should capture the first-touch referrer once and never overwrite it', () => {
  vi.stubGlobal('location', new URL('https://www.example.com/'))
  vi.spyOn(document, 'referrer', 'get')
    .mockReturnValueOnce('https://partner.example/landing')
    .mockReturnValueOnce('https://www.example.com/page')
  createIdentity().updateAcquisitionProps()
  createIdentity().updateAcquisitionProps()

  expect(parseCookie()['firstTouch'].referrer).toBe('https://partner.example/landing')
})

test('should truncate the referrer and the utm values to 255 characters', () => {
  vi.stubGlobal('location', new URL(`https://www.example.com/?utm_source=${'x'.repeat(300)}`))
  vi.spyOn(document, 'referrer', 'get').mockReturnValue(`https://ad.example/?q=${'x'.repeat(2000)}`)

  createIdentity().updateAcquisitionProps()

  const entry = parseCookie()
  expect(entry['firstTouch'].referrer).toHaveLength(255)
  expect(entry['firstTouch'].utms.initial_utm_source).toHaveLength(255)
  expect(entry['utm_source']).toHaveLength(255)
})

test('should not capture first-touch utms when the url has no canonical param', () => {
  vi.stubGlobal('location', new URL('https://www.example.com/?utm_custom=abc'))

  createIdentity().updateAcquisitionProps()

  expect(parseCookie()['firstTouch'].utms).toBeUndefined()
})

test('should keep the first-touch utms when a later visit brings different ones', () => {
  vi.stubGlobal('location', new URL('https://www.example.com/?utm_source=google'))
  createIdentity().updateAcquisitionProps()
  vi.stubGlobal('location', new URL('https://www.example.com/?utm_source=newsletter'))
  createIdentity().updateAcquisitionProps()

  expect(parseCookie()['firstTouch'].utms.initial_utm_source).toBe('google')
  expect(parseCookie()['utm_source']).toBe('newsletter')
})

test('should report the captured first touch as set-once props', () => {
  writeAnalyticsCookie({
    firstTouch: { referrer: null, utms: { initial_utm_source: 'google' } },
  })

  expect(createIdentity().getFirstTouchProps()).toEqual({
    initial_referrer: null,
    initial_utm_source: 'google',
  })
})

test('should read the initial referrer from the first touch, not from the legacy prop', () => {
  writeAnalyticsCookie({
    $initial_referrer: 'https://legacy.example/landing',
    utm_source: 'google',
    firstTouch: { referrer: 'https://partner.example/landing' },
  })

  expect(createIdentity().getAcquisitionProps()).toEqual({
    initial_referrer: 'https://partner.example/landing',
    utm_source: 'google',
  })
})

test('should truncate an astral-plane utm value without splitting a surrogate pair', () => {
  // '𝕏' is one code point but two UTF-16 code units, so a plain slice(0, 255) lands mid-pair
  const astralValue = '𝕏'.repeat(300)
  vi.stubGlobal(
    'location',
    new URL(`https://www.example.com/?utm_source=${encodeURIComponent(astralValue)}`),
  )

  // localStorage, because the escaped value is far past the cookie limit
  createIdentity({ persistence: 'localStorage', persistenceKey: 'key' }).updateAcquisitionProps()

  const entry = JSON.parse(localStorage.getItem('key')!)
  const truncated = entry['firstTouch'].utms.initial_utm_source as string
  expect(Array.from(truncated)).toHaveLength(255)
  expect(truncated).toBe(Array.from(astralValue).slice(0, 255).join(''))
})

test('should keep the last good cookie and call onError when the entry gets too large', () => {
  const onError = vi.fn<(err: unknown) => void>()
  const identity = createIdentity({ onError })
  const distinctId = identity.getDistinctId()

  const maxedOut = 'x'.repeat(MAX_ANALYTICS_PROPERTY_LENGTH)
  const params = CANONICAL_UTM_PARAMS.map(param => `${param}=${maxedOut}`).join('&')
  vi.stubGlobal('location', new URL(`https://www.example.com/?${params}`))
  identity.updateAcquisitionProps()

  expect(onError).toHaveBeenCalledTimes(1)
  const err = onError.mock.calls[0]![0] as AppError
  expect(err.message).toMatch(/length limit/)
  expect(err.data['bytes']).toBeGreaterThan(3800)
  // The identity survived, the oversized utms never reached the cookie
  expect(parseCookie()).toEqual({
    distinct_id: distinctId,
    $device_id: DEVICE_ID,
  })
})

test('should call onError with the serialized size when the storage write is rejected', () => {
  const onError = vi.fn<(err: unknown) => void>()
  const identity = createIdentity({
    persistence: 'localStorage',
    persistenceKey: 'key',
    onError,
  })
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
    throw new Error('quota exceeded')
  })

  identity.getDistinctId()

  expect(onError).toHaveBeenCalledTimes(1)
  const err = onError.mock.calls[0]![0] as AppError
  expect(err.message).toBe('quota exceeded')
  expect(err.data['bytes']).toBeGreaterThan(0)
})

test('should call onError when the cookie write does not persist', () => {
  const onError = vi.fn<(err: unknown) => void>()
  // A domain the page is not allowed to set so the browser drops the write silently
  const identity = createIdentity({ onError, cookieDomain: '.example.com' })

  identity.getDistinctId()

  expect(onError).toHaveBeenCalledTimes(1)
  const err = onError.mock.calls[0]![0] as AppError
  expect(err).toBeInstanceOf(AnalyticsClientError)
  expect(err).toMatchObject({
    name: 'AnalyticsClientError',
    message: 'cookie write did not persist',
    data: { hadPreviousCookie: false },
  })
  expect(err.data['bytes']).toBeGreaterThan(0)
})

test('should not report a failed write when an older same-name cookie shadows the new value', () => {
  const onError = vi.fn<(err: unknown) => void>()
  // Cookies are keyed by name+domain+path, so a leftover under a different scope coexists with
  // the one we write and is served first.
  history.pushState({}, '', '/deep/page')
  document.cookie = `${cookieName}=stale; path=/deep`

  const distinctId = createIdentity({ onError }).getDistinctId()

  expect(document.cookie.split('; ')[0]).toBe(`${cookieName}=stale`)
  expect(distinctId).toBe(DISTINCT_ID)
  expect(onError).not.toHaveBeenCalled()
})

test('should not call onError when the cookie write persists', () => {
  const onError = vi.fn<(err: unknown) => void>()
  const identity = createIdentity({ onError })

  identity.getDistinctId()

  expect(getCookie(cookieName)).toBeTruthy()
  expect(onError).not.toHaveBeenCalled()
})

test('should keep working when a consumer onError hook throws', () => {
  const identity = createIdentity({
    persistence: 'localStorage',
    persistenceKey: 'key',
    onError: () => {
      throw new Error('reporting failed')
    },
  })
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
    throw new Error('quota exceeded')
  })

  const distinctId = identity.getDistinctId()
  expect(distinctId).toBe(DISTINCT_ID)
  expect(identity.getDistinctId()).toBe(distinctId)
})

test('should build the distinct id from the device id with generateDistinctId', () => {
  const identity = createIdentity({ generateDistinctId: deviceId => `device:${deviceId}` })

  const distinctId = identity.getDistinctId()

  expect(distinctId).toBe(`device:${identity.getDeviceId()}`)
})

function createIdentity(cfg?: Partial<AnalyticsIdentityCfg>): AnalyticsIdentity {
  return new AnalyticsIdentity({
    persistence: 'cookie',
    persistenceKey: cookieName,
    ...cfg,
  })
}

function writeAnalyticsCookie(props: Record<string, unknown>): void {
  document.cookie = `${cookieName}=${encodeURIComponent(JSON.stringify(props))}; path=/`
}

function mockFirstTouchUtms(values: FirstTouchUtms): FirstTouchUtms {
  const nulls = Object.fromEntries(CANONICAL_UTM_PARAMS.map(p => [`initial_${p}`, null]))
  return { ...nulls, ...values }
}

function parseCookie(): Record<string, any> {
  return JSON.parse(getCookie(cookieName)!)
}
