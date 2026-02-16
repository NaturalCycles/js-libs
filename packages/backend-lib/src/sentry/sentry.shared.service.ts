import { _anyToError, _isErrorObject } from '@naturalcycles/js-lib/error'
import type { CommonLogger, CommonLogLevel } from '@naturalcycles/js-lib/log'
import type { Primitive, StringMap } from '@naturalcycles/js-lib/types'
import type { InspectAnyOptions } from '@naturalcycles/nodejs-lib'
import { _inspect } from '@naturalcycles/nodejs-lib'
import type { Breadcrumb, SeverityLevel } from '@sentry/node-core/light'
import type * as SentryLib from '@sentry/node-core/light'
import { getRequestLogger } from '../server/asyncLocalStorageMiddleware.js'

export interface SentrySharedServiceCfg {
  sentry: typeof SentryLib
}

const sentrySeverityMap: Record<SeverityLevel, CommonLogLevel> = {
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
 * }
 *
 */
export class SentrySharedService {
  constructor(sentryServiceCfg: SentrySharedServiceCfg) {
    this.sentry = sentryServiceCfg.sentry
  }

  sentry: typeof SentryLib

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
    getRequestLogger().error(...[err_, data].filter(Boolean))

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
  captureMessage(msg: string, level?: SeverityLevel): string {
    getRequestLogger()[sentrySeverityMap[level!] || 'log']('captureMessage:', msg)
    return this.sentry.captureMessage(msg, level)
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
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
    return {
      debug: () => {}, // noop
      log: () => {}, // noop
      warn: () => {}, // noop
      error: (...args) => {
        const message = args.map(arg => _inspect(arg, INSPECT_OPT)).join(' ')

        this.sentry.addBreadcrumb({
          message,
        })

        this.sentry.captureException(_anyToError(args.length === 1 ? args[0] : args))
      },
    }
  }
}
