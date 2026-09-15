import { _isEmptyObject, isServerSide } from '@naturalcycles/js-lib'
import type {
  AnalyticsDistinctId,
  FirstTouchInput,
  FirstTouchUtms,
  AnalyticsClientEvent,
  AnalyticsBatchInput,
  SetOnceUserProperties,
} from '@naturalcycles/js-lib/analytics'
import {
  CANONICAL_UTM_PARAMS,
  ANALYTICS_IDENTIFY_EVENT_NAME,
  truncateAnalyticsProperty,
} from '@naturalcycles/js-lib/analytics'
import { _mapToObject } from '@naturalcycles/js-lib/array'
import { _errorDataAppend, AppError } from '@naturalcycles/js-lib/error'
import type { ErrorData } from '@naturalcycles/js-lib/error'
import { getFetcher } from '@naturalcycles/js-lib/http'
import type { Fetcher } from '@naturalcycles/js-lib/http'
import type { CommonLogger } from '@naturalcycles/js-lib/log'
import { nanoidBrowser, nanoidBrowserCustomAlphabet } from '@naturalcycles/js-lib/nanoid'
import { _filterNullishValues, _filterObject } from '@naturalcycles/js-lib/object'
import { _safeJsonStringify } from '@naturalcycles/js-lib/string'
import { _noop } from '@naturalcycles/js-lib/types'
import type {
  AnyObject,
  NumberOfMilliseconds,
  PositiveInteger,
  UnixTimestampMillis,
} from '@naturalcycles/js-lib/types'

/**
 * Browsers drop a cookie over 4096 bytes, and the identity goes with it. The 3800 budget also
 * has to cover the `; expires=`, `; path=`, `; domain=` and `; secure` attributes that setCookie
 * appends (roughly 75 bytes), which cookieLength below does not measure. Keep that in mind
 * before raising this toward 4096.
 */
const MAX_COOKIE_LENGTH = 3800

const UTM_QUERY_PARAM_PREFIX = 'utm_'
const CLICK_QUERY_PARAMS = [
  'dclid',
  'fbclid',
  'gclid',
  'ko_click_id',
  'li_fat_id',
  'msclkid',
  'sccid',
  'ttclid',
  'twclid',
  'wbraid',
]

const generateEventId = nanoidBrowserCustomAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  16,
)

/**
 * Self-hosted analytics event client.
 *
 * Captures client-side analytics events, adds browser page properties, batches them, retries
 * transient failures and delivers them to our own Backend via a single REST endpoint.
 */
export class AnalyticsClient implements AnalyticsClientApi {
  constructor(cfg: AnalyticsClientCfg) {
    const localStorageKeyPrefix = cfg.localStorageKeyPrefix || 'nca'
    this.cfg = {
      onError: _noop,
      firstTouchUrl: '',
      isEnabled: () => true,
      getCommonProps: () => ({}),
      flushInterval: 5000,
      maxBatchSize: 50,
      maxBatchBytes: 60_000,
      maxQueueSize: 1000,
      maxRetryBackoff: 600_000,
      requestTimeout: 30_000,
      persistQueue: true,
      maxPersistedAge: 24 * 3_600_000,
      localStorageKeyPrefix,
      logger: console,
      debug: false,
      ...cfg,
    }
    this.identity = new AnalyticsIdentity(this.cfg.identity)
    // Unlike events, we only fire firstTouch once per pageload, so
    // we care about and can tolerate retries
    this.firstTouchFetcher = getFetcher({
      logger: this.cfg.logger,
      retryPost: true,
      timeoutSeconds: 10,
    })
    if (isServerSide()) return
    this.restoreOrphanedQueues()
    globalThis.addEventListener('pagehide', this.handlePageHide)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
  }

  private cfg: Required<AnalyticsClientCfg>
  private firstTouchFetcher: Fetcher
  /**
   * The built-in identity, constructed from `cfg.identity`. Also readable by application code,
   * e.g to feed the distinctId or acquisition props to other integrations.
   */
  readonly identity: AnalyticsIdentity
  /**
   * Random id of this AnalyticsClient instance (in practice - of this tab/pageload),
   * used to namespace the localStorage queue snapshot.
   */
  private tabId = nanoidBrowser(10)
  private queue: AnalyticsClientEvent[] = []
  private flushTimer?: NodeJS.Timeout
  private isFlushing = false
  private consecutiveFailures = 0
  /**
   * Requested by the server via `Retry-After` header (already converted to ms).
   */
  private retryAfter: NumberOfMilliseconds = 0
  private hasUpdatedAcquisitionProps = false
  private readonly eventListeners = new Set<AnalyticsEventListener>()

  private handlePageHide = (): void => {
    this.flushNow()
  }

  private handleVisibilityChange = (): void => {
    // Fires on mobile when the tab is backgrounded (where pagehide may never fire) -
    // the last reliable moment to hand events over to the browser
    if (document.visibilityState === 'hidden') this.flushNow()
  }

  /**
   * Optional eager bootstrapping, to call once at app boot: registers the acquisition props
   * into the identity entry while the landing url/referrer are still current - the moment
   * an SPA navigation can strip the utm params off the url before the first event fires. Gated by cfg.isEnabled, like the events themselves.
   * Without it the registration happens lazily before the first enabled event.
   */
  init(): void {
    if (isServerSide()) return
    if (!this.cfg.isEnabled()) return
    this.ensureAcquisitionProps()
    this.replayFromStub()
  }

  track(name: string, props?: AnyObject): void {
    const event = this.enqueue(name, props)
    if (event) this.notifyEventListeners(event)
  }

  /**
   * Replays the calls a stub recorded on the page before this client loaded, under the timestamps
   * they were made at. Tracked in order, so calls made before the stub's `identify()` keep the
   * anonymous identity.
   */
  private replayFromStub(): void {
    const stub = globalThis.analyticsClient
    if (!stub || !('q' in stub) || !Array.isArray(stub.q)) return

    for (const call of stub.q) {
      try {
        if (call.method === 'identify') {
          this.identify(call.args[0])
        } else {
          // Not track(), so the call keeps the timestamp it was originally made at
          const event = this.enqueue(call.args[0], call.args[1], call.ts)
          if (event) this.notifyEventListeners(event)
        }
      } catch (err) {
        this.cfg.logger.warn('[analytics] could not replay a stubbed call', err)
      }
    }
    stub.q.length = 0
  }

  /**
   * Registers a listener called synchronously for every delivered event, past the gates in
   * `track()`. Returns an unsubscribe function. Listeners receive a snapshot and cannot affect
   * delivery, and a throwing listener never breaks tracking.
   */
  onEvent(listener: AnalyticsEventListener): () => void {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  private notifyEventListeners(event: AnalyticsClientEvent): void {
    if (!this.eventListeners.size) return
    const distinctId = event.userId || this.identity.getDistinctId()
    // Snapshot so a listener cannot mutate the event already queued for delivery. Shallow because
    // props may hold circular references (see track()) that a deep JSON copy would throw on.
    const snapshot: AnalyticsClientEvent = { ...event, props: { ...event.props } }
    for (const listener of this.eventListeners) {
      try {
        listener(snapshot, distinctId)
      } catch (err) {
        this.cfg.logger.warn('[analytics] onEvent listener threw', err)
      }
    }
  }

  /**
   * Sets the distinctId going forward (persisted), e.g after a successful signup.
   * Pending events are kept, each under the identity it was tracked with.
   */
  identify(userId: string): void {
    const previousDistinctId = this.identity.getDistinctId()
    this.identity.identify(userId)
    const distinctId = userId as AnalyticsDistinctId
    if (previousDistinctId === distinctId) return
    this.enqueue(ANALYTICS_IDENTIFY_EVENT_NAME, { anon_distinct_id: previousDistinctId })
    void this.flush()
    // The destination merges the event streams of the two ids, but not their profiles
    void this.sendFirstTouch()
  }

  private enqueue(
    name: string,
    props?: AnyObject,
    ts?: UnixTimestampMillis,
  ): AnalyticsClientEvent | undefined {
    if (isServerSide()) return
    if (!this.cfg.isEnabled()) return
    this.ensureAcquisitionProps()

    // Deliberately no client-side normalization: the server owns length limits, while
    // circular references are handled at serialization time by _safeJsonStringify.
    const event: AnalyticsClientEvent = {
      id: generateEventId(),
      name,
      ts: ts || (Date.now() as UnixTimestampMillis),
      props: {
        ...this.getDefaultProps(),
        ...this.cfg.getCommonProps(),
        ...props,
      },
      userId: this.identity.getDistinctId(),
    }

    if (this.cfg.debug) this.cfg.logger.log(`[analytics] ${event.name}`, event.props)
    this.queue.push(event)
    if (this.queue.length > this.cfg.maxQueueSize) {
      this.queue.shift()
      this.cfg.logger.warn('[analytics] queue overflow, dropped the oldest event')
    }
    this.persistQueue()
    if (this.queue.length >= this.cfg.maxBatchSize && !this.consecutiveFailures) {
      void this.flush()
    } else {
      this.scheduleFlush()
    }
    return event
  }

  /**
   * Clears pending events and the persisted identity entry, including its acquisition
   * properties. A new identity is generated on next use.
   */
  reset(): void {
    this.clearPendingEvents()
    this.identity.reset()
    // The entry was wiped - re-register the acquisition props on the next tracked event
    this.hasUpdatedAcquisitionProps = false
  }

  /**
   * Drains the queue, one batch per request.
   * Called automatically (flush interval / batch size / pagehide) - public for manual flushing.
   */
  async flush(): Promise<void> {
    if (isServerSide() || this.isFlushing) return
    this.isFlushing = true
    this.clearFlushTimer()
    try {
      // The outer loop picks up events tracked while a batch was in-flight
      while (this.queue.length) {
        for (const batch of this.prepareBatches()) {
          const result = await this.sendBatch(batch)
          if (result === 'retry') {
            this.consecutiveFailures++
            this.scheduleFlush()
            return
          }
          // 'ok' or 'drop' - the batch is done either way
          this.removeFromQueue(batch.events)
          this.consecutiveFailures = 0
          this.retryAfter = 0
        }
      }
    } finally {
      this.isFlushing = false
    }
  }

  /**
   * Immediate flush: hands queued events over to the browser via keepalive fetch.
   * Runs automatically on pagehide / visibilitychange:hidden. Public so that app code can
   * hand events over right away: events tracked in its own page-lifecycle handlers (which
   * run after this client's own), and events tracked right before a navigation (e.g a
   * cta click) - unload-time delivery is best-effort and can be lost, while a
   * keepalive request from a still-alive page survives the navigation.
   * The persisted queue remains untouched because keepalive requests cannot reliably process
   * their response; a later regular flush re-sends and deduplicates the events.
   */
  flushNow(): void {
    if (!this.queue.length) return
    this.clearFlushTimer()
    for (const batch of this.prepareBatches()) {
      void this.postBatch(batch, true).catch(err => {
        this.cfg.logger.warn('[analytics] lifecycle batch failed to send; retained for retry', err)
      })
    }
    // visibilitychange can fire without unloading the page, so retain normal retry behavior.
    this.scheduleFlush()
  }

  /**
   * Removes listeners and pending timers. Only needed when an instance is discarded
   * (e.g in tests or HMR) - the app-wide singleton never needs it.
   */
  destroy(): void {
    this.clearFlushTimer()
    if (isServerSide()) return
    globalThis.removeEventListener('pagehide', this.handlePageHide)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
  }

  /**
   * Registers the acquisition props into the identity entry once per pageload, like
   * eagerly from init(), or lazily before the first
   * enabled event. Either path is gated by cfg.isEnabled, so bot/e2e/consent gating
   * applies to the persistence write too.
   */
  private ensureAcquisitionProps(): void {
    if (this.hasUpdatedAcquisitionProps) return
    this.hasUpdatedAcquisitionProps = true
    this.identity.updateAcquisitionProps()
    void this.sendFirstTouch()
  }

  /**
   * Posts the first-touch props to their own endpoint, once per pageload. Fire-and-forget:
   * `$set_once` ignores every write after the first, so a lost or repeated call costs nothing.
   */
  private async sendFirstTouch(): Promise<void> {
    const { firstTouchUrl } = this.cfg
    if (!firstTouchUrl) return
    const props = this.identity.getFirstTouchProps()
    if (!props) return

    const input: FirstTouchInput = {
      clientId: this.cfg.clientId,
      userId: this.identity.getDistinctId(),
      props,
    }
    const res = await this.firstTouchFetcher.doFetch({
      url: firstTouchUrl,
      method: 'POST',
      text: _safeJsonStringify(input),
      responseType: 'void',
    })
    if (!res.err) return
    try {
      this.cfg.onError(_errorDataAppend(res.err, { firstTouch: true }))
    } catch (err) {
      this.cfg.logger.warn('[analytics] onError hook threw', err)
    }
  }

  private getDefaultProps(): AnyObject {
    const referrer = document.referrer
    const url = new URL(globalThis.location.href)
    return {
      ...(referrer && { referrer }),
      current_url: globalThis.location.href,
      screen_height: globalThis.screen.height,
      screen_width: globalThis.screen.width,
      // First-touch initial_referrer and last-touch utm_* come from the identity entry -
      // the single acquisition-props store (cross-subdomain when cookie-persisted)
      ...this.identity.getAcquisitionProps(),
      // Utms of the current url win over the persisted last-touch values
      ...getLastTouchUtms(url),
      // Click ids are read from the current url only, never persisted
      ...getQueryProperties(url, CLICK_QUERY_PARAMS),
    }
  }

  private clearPendingEvents(): void {
    this.clearFlushTimer()
    this.queue = []
    this.consecutiveFailures = 0
    this.retryAfter = 0
    this.persistQueue()
  }

  private async sendBatch(batch: PreparedBatch): Promise<SendBatchResult> {
    let res: Response
    try {
      // Optional chaining: AbortSignal.timeout is missing in older Safari (<16)
      res = await this.postBatch(batch, false, AbortSignal.timeout?.(this.cfg.requestTimeout))
    } catch (err) {
      // Network error or timeout - eligible for retry
      this.cfg.logger.warn('[analytics] batch failed to send, will retry', err)
      return 'retry'
    }
    if (res.ok) return 'ok'
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get('retry-after'))
      if (retryAfter) this.retryAfter = retryAfter * 1000
      this.cfg.logger.warn(`[analytics] batch rejected with ${res.status}, will retry`)
      return 'retry'
    }
    // Non-retryable 4xx - drop the batch to avoid a poison-pill retry loop
    this.cfg.logger.error(
      `[analytics] batch rejected with ${res.status}, dropping ${batch.events.length} event(s)`,
    )
    try {
      this.cfg.onError(
        new AppError('batch dropped on a non-retryable status', {
          status: res.status,
          eventCount: batch.events.length,
        }),
      )
    } catch (err) {
      this.cfg.logger.warn('[analytics] onError hook threw', err)
    }
    return 'drop'
  }

  private async postBatch(
    batch: PreparedBatch,
    isLifecycleFlush: boolean,
    signal?: AbortSignal,
  ): Promise<Response> {
    return fetch(this.cfg.url, {
      method: 'POST',
      // `text/plain` (a CORS-safelisted content-type) avoids a preflight OPTIONS round-trip
      // on every batch and keeps pagehide requests deliverable. The body is still a JSON string.
      headers: { 'content-type': 'text/plain' },
      body: batch.body,
      // Regular flushes use ordinary fetch; keepalive is reserved for page lifecycle delivery.
      ...(isLifecycleFlush && { keepalive: true }),
      signal,
    })
  }

  /**
   * Splits the whole queue into request-ready batches of at most maxBatchSize events
   * and maxBatchBytes serialized bytes each.
   */
  private prepareBatches(): PreparedBatch[] {
    const batches: PreparedBatch[] = []
    let current: PendingBatch | undefined
    const userId = this.identity.getDistinctId()

    for (const event of this.queue) {
      // _safeJsonStringify (here and wherever events are serialized): circular references in
      // props degrade to '[Circular ~]' markers instead of throwing - tracking must never
      // break the app. Non-circular events take its native JSON.stringify fast path.
      const eventBytes = getUtf8ByteLength(_safeJsonStringify(event))
      const hasReachedCount = current?.events.length === this.cfg.maxBatchSize
      const separatorBytes = current?.events.length ? 1 : 0
      const hasReachedBytes =
        !!current && current.bodyBytes + separatorBytes + eventBytes > this.cfg.maxBatchBytes

      if (current && (hasReachedCount || hasReachedBytes)) {
        batches.push(this.finalizeBatch(current))
        current = undefined
      }

      current ||= this.createPendingBatch(userId)
      const nextSeparatorBytes = current.events.length ? 1 : 0
      current.events.push(event)
      current.bodyBytes += nextSeparatorBytes + eventBytes
    }

    if (current?.events.length) {
      batches.push(this.finalizeBatch(current))
    }
    return batches
  }

  private createPendingBatch(userId: AnalyticsDistinctId): PendingBatch {
    const sentAt = Date.now() as UnixTimestampMillis
    const emptyBody: AnalyticsBatchInput = {
      sentAt,
      clientId: this.cfg.clientId,
      userId,
      events: [],
    }
    return {
      sentAt,
      userId,
      events: [],
      bodyBytes: getUtf8ByteLength(JSON.stringify(emptyBody)),
    }
  }

  private finalizeBatch(batch: PendingBatch): PreparedBatch {
    const input: AnalyticsBatchInput = {
      sentAt: batch.sentAt,
      clientId: this.cfg.clientId,
      userId: batch.userId,
      events: batch.events,
    }
    return {
      events: batch.events,
      body: _safeJsonStringify(input),
    }
  }

  /**
   * Adopts queue snapshots persisted by previous pageloads (crashed/killed tabs) and re-sends them.
   * A snapshot of a still-alive tab may be adopted too - the resulting duplicate delivery
   * is deduped by the Backend via event ids.
   */
  private restoreOrphanedQueues(): void {
    if (!this.cfg.persistQueue) return
    try {
      const prefix = `${this.cfg.localStorageKeyPrefix}.q.`
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(prefix)) keys.push(key)
      }
      if (!keys.length) return
      const minTs = Date.now() - this.cfg.maxPersistedAge
      for (const key of keys) {
        try {
          const events: AnalyticsClientEvent[] = JSON.parse(localStorage.getItem(key) || '[]')
          localStorage.removeItem(key)
          this.queue.push(...events.filter(event => event.ts >= minTs))
        } catch {
          // Corrupted snapshot - discard only this key and continue restoring the others.
          localStorage.removeItem(key)
        }
      }
      if (this.queue.length > this.cfg.maxQueueSize) {
        this.queue.splice(0, this.queue.length - this.cfg.maxQueueSize)
      }
      if (this.queue.length) {
        this.persistQueue()
        this.scheduleFlush()
      }
    } catch {
      // localStorage unavailable - pending in-memory events continue normally
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer || isServerSide()) return
    let delayMs = this.cfg.flushInterval
    if (this.consecutiveFailures) {
      delayMs = Math.min(
        this.cfg.flushInterval * 2 ** this.consecutiveFailures,
        this.cfg.maxRetryBackoff,
      )
      delayMs = Math.max(delayMs, this.retryAfter)
    }
    this.flushTimer = setTimeout(() => {
      this.flushTimer = undefined
      void this.flush()
    }, delayMs)
  }

  private clearFlushTimer(): void {
    if (!this.flushTimer) return
    clearTimeout(this.flushTimer)
    this.flushTimer = undefined
  }

  private removeFromQueue(batch: AnalyticsClientEvent[]): void {
    const ids = new Set(batch.map(event => event.id))
    this.queue = this.queue.filter(event => !ids.has(event.id))
    this.persistQueue()
  }

  private persistQueue(): void {
    if (!this.cfg.persistQueue) return
    try {
      if (this.queue.length) {
        localStorage.setItem(this.queueKey, _safeJsonStringify(this.queue))
      } else {
        localStorage.removeItem(this.queueKey)
      }
    } catch {
      // localStorage unavailable/full - analytics must never break the app
    }
  }

  private get queueKey(): string {
    return `${this.cfg.localStorageKeyPrefix}.q.${this.tabId}`
  }
}

/**
 * Distinct-id generation and persistence:
 *
 * - a new identity is a UUID v4 device id, stored as `$device_id`,
 *   with `distinct_id` derived from it by `generateDistinctId`
 * - `identify(userId)` sets `distinct_id` and `user_id`, keeping `$device_id` (same person)
 * - `reset()` clears the whole entry and generates a fresh anonymous identity (unrelated person)
 * - the identity is stored as a JSON object under a single cookie / localStorage name
 *
 * Apps sharing a persistenceName and cookie domain read and write the same identity:
 * whichever writes first, the others adopt it. Properties they keep in the same entry
 * are preserved on write, never interpreted.
 *
 * Storage failures (SSR, blocked cookies/localStorage) degrade to an in-memory session-scoped
 * identity - analytics must never break the app.
 */
export class AnalyticsIdentity {
  constructor(cfg: AnalyticsIdentityCfg) {
    this.cfg = {
      onError: _noop,
      cookieDomain: '',
      expireDays: 365,
      secureCookie: false,
      // TODO: make it emit something else by default, like the device id itself
      generateDistinctId: deviceId => `$device:${deviceId}`,
      ...cfg,
    }
  }

  private cfg: Required<AnalyticsIdentityCfg>
  /**
   * Fallback identity for when storage is unavailable, and the last-known-good copy
   * if storage becomes unreadable later.
   */
  private memoryEntry: PersistedIdentity = {}
  private hasRefreshedExpiry = false

  getDistinctId(): AnalyticsDistinctId {
    return this.ensureIdentity().distinct_id
  }

  /**
   * The bare (unprefixed) device UUID. Undefined for legacy identities persisted before
   * a device id was stored (their `distinct_id` has no device prefix either).
   */
  getDeviceId(): string | undefined {
    return this.ensureIdentity().$device_id
  }

  /**
   * Reads any property of the persisted entry: the acquisition props maintained by
   * updateAcquisitionProps(), or props written by another app sharing the entry.
   */
  getProperty(key: string): unknown {
    return this.loadEntry()[key]
  }

  /**
   * The acquisition props that can't be derived from event payloads, and are stored separately.
   */
  getAcquisitionProps(): AnyObject {
    const entry = this.loadEntry()
    const props: AnyObject = _filterObject(entry, k => String(k).startsWith(UTM_QUERY_PARAM_PREFIX))
    const { firstTouch } = entry
    if (firstTouch) {
      props['initial_referrer'] = firstTouch.referrer
    }
    return props
  }

  /** The captured first touch, as the props to `$set_once` on the profile. */
  getFirstTouchProps(): SetOnceUserProperties | undefined {
    const { firstTouch } = this.loadEntry()
    if (!firstTouch) return

    return { ...firstTouch.utms, initial_referrer: firstTouch.referrer }
  }

  /**
   * Sets the identity going forward, e.g after a successful signup/login.
   * `$device_id` is kept, so the destination can merge the pre-identify
   * anonymous events into the same user.
   */
  identify(userId: string): void {
    const entry = this.ensureIdentity()
    // Identities persisted before a device id was stored adopt the previous
    // distinct_id as their device id
    entry.$device_id ||= entry.distinct_id
    entry.user_id = userId as AnalyticsDistinctId
    entry.distinct_id = entry.user_id
    this.saveEntry(entry)
  }

  /**
   * Clears the whole persisted entry and generates a fresh anonymous identity.
   * Call only when switching to an UNRELATED identity (e.g logout): everything else stored
   * in the entry may belong to the previous user, so it goes too.
   */
  reset(): void {
    const deviceId = crypto.randomUUID()
    this.saveEntry({
      distinct_id: this.cfg.generateDistinctId(deviceId) as AnalyticsDistinctId,
      $device_id: deviceId,
    })
  }

  /** Collects properties of the user that can be used to attribute traffic. */
  updateAcquisitionProps(): void {
    if (isServerSide()) return
    const entry = this.loadEntry()
    const url = new URL(globalThis.location.href)
    Object.assign(entry, getLastTouchUtms(url))
    entry.firstTouch ||= { referrer: getReferrer() }
    entry.firstTouch.utms ||= getFirstTouchUtms(url)
    this.saveEntry(entry)
  }

  private ensureIdentity(): PersistedIdentity & { distinct_id: AnalyticsDistinctId } {
    const entry = this.loadEntry()
    if (entry.distinct_id) {
      this.refreshExpiry(entry)
    } else {
      const deviceId = crypto.randomUUID()
      entry.distinct_id = this.cfg.generateDistinctId(deviceId) as AnalyticsDistinctId
      entry.$device_id = deviceId
      this.saveEntry(entry)
    }
    return entry as PersistedIdentity & { distinct_id: AnalyticsDistinctId }
  }

  /**
   * The cookie expiration window slides: expireDays counts from the LAST visit, not the
   * first. Re-saved once per instance (in practice - once per pageload).
   */
  private refreshExpiry(entry: PersistedIdentity): void {
    if (this.hasRefreshedExpiry || this.cfg.persistence !== 'cookie') return
    this.saveEntry(entry)
  }

  private loadEntry(): PersistedIdentity {
    try {
      const raw =
        this.cfg.persistence === 'cookie'
          ? getCookie(this.cfg.persistenceKey)
          : localStorage.getItem(this.cfg.persistenceKey)
      if (raw) this.memoryEntry = JSON.parse(raw)
    } catch {
      // Storage unavailable (SSR, blocked) or corrupted JSON - keep the in-memory copy
    }
    return this.memoryEntry
  }

  private saveEntry(entry: PersistedIdentity): void {
    this.memoryEntry = entry
    this.hasRefreshedExpiry = true
    // Stays 0 when the failure came before serializing, which distinguishes it from a rejected write
    let bytes = 0
    try {
      const value = JSON.stringify(entry)
      bytes = value.length
      if (this.cfg.persistence === 'cookie') {
        bytes = this.cookieLength(entry)
        if (bytes > MAX_COOKIE_LENGTH) {
          // Writing it would make the browser drop the cookie, and the persisted identity
          // with it. The last good cookie is kept instead, and this entry stays in memory.
          this.reportError(new AnalyticsClientError('cookie exceeded the length limit', { bytes }))
          return
        }
        setCookie(
          this.cfg.persistenceKey,
          value,
          this.cfg.expireDays,
          this.cfg.cookieDomain,
          this.cfg.secureCookie,
        )
        // `document.cookie` swallows a rejected write (cookies disabled, a domain the page is
        // not allowed to set, ITP), so reading it back is the only way to notice. A leftover
        // cookie of the same name can shadow the one just written, so any match counts.
        const persisted = getCookieValues(this.cfg.persistenceKey)
        if (!persisted.includes(value)) {
          this.reportError(
            new AnalyticsClientError('cookie write did not persist', {
              bytes,
              hadPreviousCookie: persisted.length > 0,
            }),
          )
        }
      } else {
        localStorage.setItem(this.cfg.persistenceKey, value)
      }
    } catch (err) {
      // The identity stays session-scoped in memory
      this.reportError(_errorDataAppend(err, { bytes }))
    }
  }

  private cookieLength(entry: PersistedIdentity): number {
    return this.cfg.persistenceKey.length + encodeURIComponent(JSON.stringify(entry)).length
  }

  private reportError(err: unknown): void {
    try {
      this.cfg.onError(err)
    } catch {
      // A consumer hook must not break identity updates
    }
  }
}

/** The non-empty canonical `utm_*` params of the given url. */
function getLastTouchUtms(url: URL): AnyObject {
  const props: AnyObject = {}
  for (const param of CANONICAL_UTM_PARAMS) {
    const value = url.searchParams.get(param)
    if (value) props[param] = truncateAnalyticsProperty(value)
  }
  return props
}

/** The referrer of this pageload, or null when it has none (a direct visit). */
function getReferrer(): string | null {
  return truncateAnalyticsProperty(document.referrer) || null
}

/** Captures all utms if any are set, otherwise none */
function getFirstTouchUtms(url: URL): FirstTouchUtms | undefined {
  // The absent ones are stored as null, so a later campaign cannot fill in the gaps
  const utms = _mapToObject(CANONICAL_UTM_PARAMS, param => {
    const value = url.searchParams.get(param)
    return [`initial_${param}`, value ? truncateAnalyticsProperty(value) : null]
  })

  if (_isEmptyObject(_filterNullishValues(utms))) return
  return utms
}

function getQueryProperties(url: URL, keys: string[]): AnyObject {
  return Object.fromEntries(
    keys.flatMap(key => {
      const value = url.searchParams.get(key)
      return value ? [[key, value]] : []
    }),
  )
}

// Shared instance: runs once per event per batch preparation (not per property).
// we measure to stay under the fetch keepalive body quota.
const textEncoder = new TextEncoder()

function getUtf8ByteLength(value: string): number {
  return textEncoder.encode(value).byteLength
}

/** The first visible value under this name, or null. */
export function getCookie(name: string): string | null {
  if (!name) return null
  return getCookieValues(name)[0] ?? null
}

/**
 * Every visible value under this name, in `document.cookie` order. A host-only and a
 * parent-domain cookie with the same name and path coexist as separate cookies.
 */
function getCookieValues(name: string): string[] {
  const nameEq = `${name}=`
  const values: string[] = []
  for (let c of document.cookie.split(';')) {
    while (c.startsWith(' ')) c = c.slice(1)
    if (!c.startsWith(nameEq)) continue
    values.push(decodeURIComponent(c.slice(nameEq.length)))
  }
  return values
}

/**
 * Writes the cookie and returns what was written, which the tests assert on.
 * `domain` is explicit, e.g `.example.com` to share it across subdomains.
 */
export function setCookie(
  name: string,
  value: string,
  days: PositiveInteger,
  domain: string,
  isSecure: boolean,
): string {
  const attrs = [`${name}=${encodeURIComponent(value)}`]
  if (days) {
    attrs.push(`expires=${new Date(Date.now() + days * 24 * 3600 * 1000).toUTCString()}`)
  }
  attrs.push('path=/')
  if (domain) attrs.push(`domain=${domain}`)
  if (isSecure) attrs.push('secure')

  const cookie = attrs.join('; ')
  // The Cookie Store API is async and missing in Safari, so this stays synchronous
  // oxlint-disable-next-line unicorn/no-document-cookie
  document.cookie = cookie
  return cookie
}

export class AnalyticsClientError extends AppError {
  constructor(message: string, data?: ErrorData) {
    super(message, data, { name: 'AnalyticsClientError' })
  }
}

/** Listener called for every delivered event. */
/**
 * A call recorded by an inline stub before the client loaded, e.g
 * `{ method: 'track', args: ['Click', { element: 'cta' }], ts: Date.now() }`.
 */
declare global {
  var analyticsClient: AnalyticsClient | AnalyticsClientStub | undefined
}

/** The stub a page assigns to `globalThis.analyticsClient` before the client loads. */
export interface AnalyticsClientStub extends AnalyticsClientApi {
  q: StubbedCall[]
}

/** What a page can call, on the loaded client or on a stub standing in for it. */
export interface AnalyticsClientApi {
  init: () => void
  track: (name: string, props?: AnyObject) => void
  identify: (userId: string) => void
  onEvent: (listener: AnalyticsEventListener) => () => void
  reset: () => void
  flushNow: () => void
  destroy: () => void
}

export type StubbedCall =
  | { method: 'track'; args: [name: string, props?: AnyObject]; ts: UnixTimestampMillis }
  | { method: 'identify'; args: [userId: string]; ts: UnixTimestampMillis }

export type AnalyticsEventListener = (
  event: AnalyticsClientEvent,
  distinctId: AnalyticsDistinctId,
) => void

type SendBatchResult = 'ok' | 'retry' | 'drop'

export interface AnalyticsClientCfg {
  /**
   * Full url of the ingestion endpoint, e.g `https://api.example.com/web/e`.
   */
  url: string
  /**
   * Full url of the first-touch endpoint, e.g `https://api.example.com/web/ft`.
   * Omit to not send first-touch profile props at all.
   */
  firstTouchUrl?: string
  clientId: number
  /**
   * Evaluated on every track() call; return false to drop the event.
   * Use it for bot/e2e/consent gating.
   * Defaults to always-enabled (tracking is still client-side only).
   */
  isEnabled?: () => boolean
  /**
   * Props merged into every event, evaluated at track() time. Per-call props win.
   */
  getCommonProps?: () => AnyObject
  /**
   * Cfg of the built-in identity (see AnalyticsIdentity), constructed by the client and
   * exposed as `client.identity`.
   * Defaults to a localStorage-persisted identity under `${localStorageKeyPrefix}.identity`.
   * Use cookie persistence to share the identity across subdomains.
   */
  identity: AnalyticsIdentityCfg
  /**
   * How often the queue is flushed.
   * Default 5000.
   */
  flushInterval?: NumberOfMilliseconds
  /**
   * Max events per request. The queue also flushes early when it's reached.
   * Default 50.
   */
  maxBatchSize?: PositiveInteger
  /**
   * Max serialized request body size. Default 60_000, leaving headroom below
   * the browser keepalive request limit of 65_536 bytes.
   */
  maxBatchBytes?: PositiveInteger
  /**
   * Max events held in the queue while the endpoint is unreachable.
   * Oldest events are dropped beyond it. Default 1000.
   */
  maxQueueSize?: PositiveInteger
  /**
   * Cap for the exponential retry backoff. Default 10 minutes.
   */
  maxRetryBackoff?: NumberOfMilliseconds
  /**
   * Per-request timeout. Default 30_000.
   */
  requestTimeout?: NumberOfMilliseconds
  /**
   * Persist unsent events in localStorage and restore them on the next page load,
   * so events survive crashes/killed tabs. There is no cross-tab locking - dedupe by
   * event id makes duplicates harmless.
   * Default true.
   */
  persistQueue?: boolean
  /**
   * Max age of persisted events to restore; older ones are discarded. Default 24 hours.
   */
  maxPersistedAge?: NumberOfMilliseconds
  /**
   * localStorage key prefix for the queue snapshots and the default identity key.
   * Default 'nca'.
   */
  localStorageKeyPrefix?: string
  /**
   * Default `console`.
   */
  logger?: CommonLogger
  /**
   * Log every tracked event. Default false.
   */
  debug?: boolean
  /** Called on errors related to tracking events. */
  onError?: (err: unknown) => void
  // TODO: make onEvent a cfg callback? A subscription loses events tracked before it attaches.
}

export interface AnalyticsIdentityCfg {
  /**
   * Where the identity is persisted:
   * 'cookie' - shareable across subdomains via `cookieDomain`,
   * 'localStorage' - per-origin, for when cross-(sub)domain sharing is not needed.
   */
  persistence: 'cookie' | 'localStorage'
  /**
   * Cookie name / localStorage key. Apps sharing an identity must use the same one,
   * and must rename in lockstep, otherwise their identities diverge on the next
   * identify()/reset().
   */
  persistenceKey: string
  /**
   * Explicit cookie domain, e.g `.example.com` to share the identity across subdomains.
   * Default '' - a host-only cookie.
   */
  cookieDomain?: string
  /**
   * Cookie lifetime in days, sliding: re-saved on first use of each pageload. Default 365.
   */
  expireDays?: PositiveInteger
  /**
   * Sets the `secure` cookie attribute. Default false.
   */
  secureCookie?: boolean
  /**
   * Builds the distinct id of a new anonymous identity from its generated device id.
   * Apps sharing an identity must use the same one, otherwise their identities diverge.
   */
  generateDistinctId?: (deviceId: string) => string
  /** Called on errors related to persisting the identity. */
  onError?: (err: unknown) => void
}

/**
 * The persisted entry. Unknown keys are preserved on write.
 */
interface PersistedIdentity {
  distinct_id?: AnalyticsDistinctId
  /**
   * The bare device UUID that `distinct_id` was derived from.
   */
  $device_id?: string
  /**
   * Set by identify() - the identified (external) user id.
   */
  user_id?: AnalyticsDistinctId
  /** The first-touch referrer and utms, each captured once. */
  firstTouch?: FirstTouch
  /**
   * Preserved on write, never interpreted.
   */
  [key: string]: unknown
}

/** Analytics properties we only persist once and don't set again. */
export interface FirstTouch {
  referrer: string | null
  utms?: FirstTouchUtms
}

interface PreparedBatch {
  events: AnalyticsClientEvent[]
  body: string
}

interface PendingBatch {
  sentAt: UnixTimestampMillis
  userId: AnalyticsDistinctId
  events: AnalyticsClientEvent[]
  bodyBytes: number
}
