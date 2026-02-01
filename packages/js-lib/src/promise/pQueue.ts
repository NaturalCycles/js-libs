import { ErrorMode } from '../error/errorMode.js'
import { createCommonLoggerAtLevel } from '../log/commonLogger.js'
import type { CommonLogger, CommonLogLevel } from '../log/commonLogger.js'
import type { AsyncFunction, PositiveInteger } from '../types.js'
import type { DeferredPromise } from './pDefer.js'
import { pDefer } from './pDefer.js'

export interface PQueueCfg {
  concurrency: PositiveInteger

  /**
   * Default: THROW_IMMEDIATELY
   *
   * THROW_AGGREGATED is not supported.
   *
   * SUPPRESS_ERRORS will still log errors via logger. It will resolve the `.push` promise with void.
   */
  errorMode?: ErrorMode

  /**
   * Default to `console`
   */
  logger?: CommonLogger

  /**
   * Default is 'log'.
   */
  logLevel?: CommonLogLevel

  /**
   * By default .push method resolves when the Promise is done (finished).
   *
   * If you set resolveOn = 'start' - .push method will resolve the Promise (with void) upon
   * the START of the processing.
   *
   * @default finish
   */
  resolveOn?: 'finish' | 'start'
}

/**
 * Inspired by: https://github.com/sindresorhus/p-queue
 *
 * Allows to push "jobs" to the queue and control its concurrency.
 * Jobs are "promise-returning functions".
 *
 * API is @experimental
 */
export class PQueue {
  constructor(cfg: PQueueCfg) {
    this.cfg = {
      errorMode: ErrorMode.THROW_IMMEDIATELY,
      ...cfg,
    }
    this.logger = createCommonLoggerAtLevel(cfg.logger, cfg.logLevel)
    this.resolveOnStart = this.cfg.resolveOn === 'start'
  }

  private readonly cfg: PQueueCfg
  private readonly resolveOnStart: boolean
  private readonly logger: CommonLogger

  inFlight = 0
  private queue: AsyncFunction[] = []
  private onIdleListeners: DeferredPromise[] = []

  /**
   * Push PromiseReturningFunction to the Queue.
   * Returns a Promise that resolves (or rejects) with the return value from the Promise.
   */
  async push<R>(fn_: AsyncFunction<R>): Promise<R> {
    const { concurrency } = this.cfg
    const { resolveOnStart, logger } = this

    const fn = fn_ as AsyncFunctionWithDefer<R>
    fn.defer ||= pDefer<R>()

    if (this.inFlight < concurrency) {
      // There is room for more jobs. Can start immediately
      this.inFlight++
      logger.debug(`inFlight++ ${this.inFlight}/${concurrency}, queue ${this.queue.length}`)
      if (resolveOnStart) fn.defer.resolve()

      runSafe(fn)
        .then(result => {
          if (!resolveOnStart) fn.defer.resolve(result)
        })
        .catch((err: Error) => {
          if (resolveOnStart) {
            logger.error(err)
            return
          }

          if (this.cfg.errorMode === ErrorMode.SUPPRESS) {
            logger.error(err)
            fn.defer.resolve() // resolve with `void`
          } else {
            // Should be handled on the outside, otherwise it'll cause UnhandledRejection
            // Not logging, because it's re-thrown upstream
            fn.defer.reject(err)
          }
        })
        .finally(() => {
          this.inFlight--
          logger.debug(`inFlight-- ${this.inFlight}/${concurrency}, queue ${this.queue.length}`)

          // check if there's room to start next job
          if (this.queue.length && this.inFlight <= concurrency) {
            const nextFn = this.queue.shift()!
            void this.push(nextFn)
          } else {
            if (this.inFlight === 0) {
              logger.debug('onIdle')
              this.onIdleListeners.forEach(defer => defer.resolve())
              this.onIdleListeners.length = 0 // empty the array
            }
          }
        })
    } else {
      this.queue.push(fn)
      logger.debug(`inFlight ${this.inFlight}/${concurrency}, queue++ ${this.queue.length}`)
    }

    return await fn.defer
  }

  get queueSize(): number {
    return this.queue.length
  }

  /**
   * Returns a Promise that resolves when the queue is Idle (next time, since the call).
   * Resolves immediately in case the queue is Idle.
   * Idle means 0 queue and 0 inFlight.
   */
  async onIdle(): Promise<void> {
    if (this.queue.length === 0 && this.inFlight === 0) return

    const listener = pDefer()
    this.onIdleListeners.push(listener)
    return await listener
  }
}

// Here we intentionally want it not async, as we don't want it to throw
// oxlint-disable-next-line typescript/promise-function-async
function runSafe<R>(fn: AsyncFunction<R>): Promise<R> {
  try {
    // Here we are intentionally not awaiting
    return fn()
  } catch (err) {
    // Handle synchronous throws - ensure inFlight is decremented
    return Promise.reject(err as Error)
  }
}

interface AsyncFunctionWithDefer<R> extends AsyncFunction<R> {
  defer: DeferredPromise<R>
}
