import { _anyToError, _isErrorObject } from '@naturalcycles/js-lib/error'
import { commonLoggerCreate } from '@naturalcycles/js-lib/log'
import type { CommonLogger, CommonLogLevel } from '@naturalcycles/js-lib/log'
import { _omit } from '@naturalcycles/js-lib/object/object.util.js'
import type { AnyObject, Primitive, StringMap } from '@naturalcycles/js-lib/types'
import type { InspectAnyOptions } from '@naturalcycles/nodejs-lib'
import { _inspect, logEntryToString } from '@naturalcycles/nodejs-lib'
import { getRequestLogger } from '../server/asyncLocalStorageMiddleware.js'

export interface SentrySharedServiceCfg<SDK extends SentryLike = SentryLike> {
  /**
   * The Sentry SDK module, e.g `import * as sentry from '@sentry/node'`.
   */
  sentry: SDK
}

/**
 * The functions of a Sentry SDK that SentrySharedService calls.
 * Typed structurally, so backend-lib does not depend on a Sentry package or version:
 * `@sentry/node` and `@sentry/node-core` both match it.
 */
export interface SentryLike {
  setUser: (user: { id: string } | null) => void
  setTags: (tags: StringMap<Primitive>) => void
  captureException: (exception: unknown) => string
  captureMessage: (message: string, level?: SentrySeverityLevel) => string
  addBreadcrumb: (breadcrumb: SentryBreadcrumb) => void
}

/**
 * Same as Sentry's `SeverityLevel`.
 */
export type SentrySeverityLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug'

/**
 * Same as Sentry's `Breadcrumb`.
 */
export interface SentryBreadcrumb {
  type?: string
  level?: SentrySeverityLevel
  event_id?: string
  category?: string
  message?: string
  data?: AnyObject
  timestamp?: number
}

const sentrySeverityMap: Record<SentrySeverityLevel, CommonLogLevel> = {
  debug: 'log',
  info: 'log',
  log: 'log',
  warning: 'warn',
  error: 'error',
  fatal: 'error',
}

const INSPECT_OPT: InspectAnyOptions = {
  colors: false,
  includeErrorData: true,
}

/**
 * Recommended sentry configuration:
 *
 * {
 *   maxValueLength: 2000, // default is 250 characters
 *   // @sentry/node 11+: otherwise its express integration captures every route error itself,
 *   // ignoring ErrorData.report and reportRate
 *   enableRuntimeChannelInjection: false,
 * }
 *
 */
export class SentrySharedService<SDK extends SentryLike = SentryLike> {
  constructor(sentryServiceCfg: SentrySharedServiceCfg<SDK>) {
    this.sentry = sentryServiceCfg.sentry
  }

  /**
   * The SDK passed in the cfg, with its full type, for the functions that this service does not wrap.
   */
  sentry: SDK

  /**
   * For GDPR reasons we never send more information than just User ID.
   */
  setUserId(id: string | null): void {
    if (id === null) {
      this.sentry.setUser(null)
      return
    }

    this.sentry.setUser({
      id,
    })
  }

  /**
   * Tag keys have a maximum length of 32 characters and can contain only
   * letters (a-zA-Z), numbers (0-9), underscores (_), periods (.), colons (:), and dashes (-).
   *
   * Tag values have a maximum length of 200 characters and they
   * cannot contain the newline (\n) character.
   *
   * https://docs.sentry.io/platforms/node/enriching-events/scopes/
   */
  setTags(tags: StringMap<Primitive>): void {
    this.sentry.setTags(tags)
  }

  /**
   * Does console.log(err)
   * Returns "eventId" or undefined (if error was not reported).
   */
  captureException(err_: any): string | undefined {
    // normalize the error
    const err = _anyToError(err_)
    const data = _isErrorObject(err) ? err.data : undefined

    // Using request-aware logger here
    // Log both the error and attached ErrorData (if any)
    getRequestLogger().error({ err: err_, ...data })

    if (data?.report === false) {
      // Skip reporting the error
      return
    }

    if (
      data?.reportRate && // E.g rate of 0.1 means 10% of errors are reported
      Math.random() > data.reportRate
    ) {
      return
    }

    // This is to avoid Sentry cutting err.message to 253 characters
    // It will log additional "breadcrumb object" before the error
    // It's a Breadcrumb, not a console.log, because console.log are NOT automatically attached as Breadcrumbs in cron-job environments (outside of Express)
    this.sentry.addBreadcrumb({
      message: _inspect(err, INSPECT_OPT),
    })

    return this.sentry.captureException(err)
  }

  /**
   * Returns "eventId"
   */
  captureMessage(msg: string, level?: SentrySeverityLevel): string {
    getRequestLogger()[sentrySeverityMap[level!] || 'log'](`captureMessage: ${msg}`)
    return this.sentry.captureMessage(msg, level)
  }

  addBreadcrumb(breadcrumb: SentryBreadcrumb): void {
    this.sentry.addBreadcrumb(breadcrumb)
  }

  /**
   * Currently it will only use `logger.error` ("error" level) and ignore `log` and `warn`.
   *
   * For each `logger.error` - it'll do a captureException.
   *
   * @experimental
   */
  getCommonLogger(): CommonLogger {
    return commonLoggerCreate(entry => {
      if (entry.level !== 'error') return // noop
      const { msg, err } = entry

      this.sentry.addBreadcrumb({
        message: logEntryToString(entry, INSPECT_OPT),
      })

      this.sentry.captureException(_anyToError(err ?? msg ?? _omit(entry, ['level'])))
    })
  }
}
