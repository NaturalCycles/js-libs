import type { AnyObject, Branded, StringMap, UnixTimestampMillis } from '../types.js'

/** Identity an event is attributed to: a generated device id, or an app-provided user id. */
export type AnalyticsDistinctId = Branded<string, 'AnalyticsDistinctId'>

/** Convenience function that returns the same value typed as AnalyticsDistinctId. */
export function asAnalyticsDistinctId(value: string): AnalyticsDistinctId {
  return value as AnalyticsDistinctId
}

/** Emitted when the identity changes, naming the anonymous id the events so far belong to. */
export const ANALYTICS_IDENTIFY_EVENT_NAME = 'identify'

/** Cap applied by `truncateAnalyticsProperty`. Event properties are passed through as given. */
export const MAX_ANALYTICS_PROPERTY_LENGTH = 255

/**
 * Caps a string property at the limit. Counts code points, because a plain
 * slice(0, N) counts UTF-16 code units and can cut a surrogate pair in half.
 */
export function truncateAnalyticsProperty(value: string): string {
  if (value.length <= MAX_ANALYTICS_PROPERTY_LENGTH) return value
  return Array.from(value).slice(0, MAX_ANALYTICS_PROPERTY_LENGTH).join('')
}

/**
 * POST body of the ingestion endpoint - a client-batched analytics event envelope.
 *
 * Sent as a JSON string with `text/plain` content-type,
 * to keep the request CORS-simple (no preflight).
 */
export interface AnalyticsBatchInput {
  /**
   * Client-side unix timestamp (ms) of when this request was sent.
   * Kept as envelope timing metadata. It must not be used to adjust `event.ts`,
   * because it changes between delivery attempts.
   */
  sentAt: UnixTimestampMillis
  /**
   * Client that sends the events. Allow-listed by the destination.
   */
  clientId: number
  /**
   * @deprecated Use `AnalyticsClientEvent.userId`, which is stamped when the event is tracked
   * rather than when the batch is sent. Still sent for clients that predate the per-event id.
   */
  userId: AnalyticsDistinctId
  events: AnalyticsClientEvent[]
}

export interface AnalyticsClientEvent {
  /**
   * Unique event id, used for deduplication. Alphanumeric-only, so it can be
   * forwarded as a dedupe key without conversion.
   */
  id: string
  /**
   * Event name, e.g `WebClick`.
   */
  name: string
  /**
   * Client-side unix timestamp (ms) of when the event was tracked (not when it was sent).
   * Stable across delivery attempts, because a deduplication key may include it.
   */
  ts: UnixTimestampMillis
  /**
   * Event properties.
   */
  props?: AnyObject
  /**
   * Identity this event was tracked under
   * TODO: make required
   */
  userId?: AnalyticsDistinctId
}

/** Canonical utm parameters. */
export const CANONICAL_UTM_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'utm_id',
  'utm_source_platform',
  'utm_campaign_id',
  'utm_creative_format',
  'utm_marketing_tactic',
]

/** Keyed by `initial_<canonical utm param>`, to avoid permanently saving non-standard ones. */
export type FirstTouchUtms = StringMap<string | null>

/**
 * Properties that will be "set once" on a user profile. Meaning they are not changed by subsequent
 * saves on the user profile. Keyed by `initial_referrer` and the first-touch utms.
 */
export type SetOnceUserProperties = StringMap<string | null>

/** Body of the first-touch endpoint, posted once per pageload. */
export interface FirstTouchInput {
  clientId: number
  userId: AnalyticsDistinctId
  props: SetOnceUserProperties
}
