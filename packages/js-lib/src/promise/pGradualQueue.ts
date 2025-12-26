import { ErrorMode } from '../error/errorMode.js'
import {
  type CommonLogger,
  type CommonLogLevel,
  createCommonLoggerAtLevel,
} from '../log/commonLogger.js'
import type { AsyncFunction, PositiveInteger } from '../types.js'
import type { DeferredPromise } from './pDefer.js'
import { pDefer } from './pDefer.js'

export interface PGradualQueueCfg {
  concurrency: PositiveInteger

  /**
   * Time in seconds to gradually increase concurrency from 1 to cfg.concurrency.
   * After this period, the queue operates at full concurrency.
   *
   * Set to 0 to disable warmup (behaves like regular PQueue).
   */
  warmupSeconds: number

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
}

/**
 * A queue similar to PQueue that gradually increases concurrency from 1 to the configured
 * maximum over a warmup period. Useful for scenarios where you want to avoid overwhelming
 * a system at startup (e.g., database connections, API rate limits).
 *
 * API is @experimental
 */
export class PGradualQueue {
  constructor(cfg: PGradualQueueCfg) {
    this.cfg = {
      errorMode: ErrorMode.THROW_IMMEDIATELY,
      ...cfg,
    }
    this.logger = createCommonLoggerAtLevel(cfg.logger, cfg.logLevel)
    this.warmupMs = cfg.warmupSeconds * 1000
    // Fast-path: if warmupSeconds is 0 or concurrency is 1, skip warmup entirely
    this.warmupComplete = cfg.warmupSeconds <= 0 || cfg.concurrency <= 1
  }

  private readonly cfg: PGradualQueueCfg
  private readonly logger: CommonLogger
  private readonly warmupMs: number

  private startTime = 0
  private warmupComplete: boolean

  inFlight = 0
  private queue: AsyncFunction[] = []

  /**
   * Get current allowed concurrency based on warmup progress.
   * Returns cfg.concurrency if warmup is complete (fast-path).
   */
  private getCurrentConcurrency(): number {
    // Fast-path: warmup complete
    if (this.warmupComplete) return this.cfg.concurrency

    const elapsed = Date.now() - this.startTime
    if (elapsed >= this.warmupMs) {
      this.warmupComplete = true
      this.logger.debug('warmup complete')
      return this.cfg.concurrency
    }

    // Linear interpolation from 1 to concurrency
    const progress = elapsed / this.warmupMs
    return Math.max(1, Math.floor(1 + (this.cfg.concurrency - 1) * progress))
  }

  /**
   * Push PromiseReturningFunction to the Queue.
   * Returns a Promise that resolves (or rejects) with the return value from the Promise.
   */
  async push<R>(fn_: AsyncFunction<R>): Promise<R> {
    // Initialize start time on first push
    if (this.startTime === 0) {
      this.startTime = Date.now()
    }

    const { logger } = this
    const fn = fn_ as AsyncFunctionWithDefer<R>
    fn.defer ||= pDefer<R>()

    const concurrency = this.getCurrentConcurrency()

    if (this.inFlight < concurrency) {
      this.inFlight++
      logger.debug(`inFlight++ ${this.inFlight}/${concurrency}, queue ${this.queue.length}`)

      runSafe(fn)
        .then(result => {
          fn.defer.resolve(result)
        })
        .catch((err: Error) => {
          if (this.cfg.errorMode === ErrorMode.SUPPRESS) {
            logger.error(err)
            fn.defer.resolve() // resolve with `void`
          } else {
            fn.defer.reject(err)
          }
        })
        .finally(() => {
          this.inFlight--
          const currentConcurrency = this.getCurrentConcurrency()
          logger.debug(
            `inFlight-- ${this.inFlight}/${currentConcurrency}, queue ${this.queue.length}`,
          )

          // Start queued jobs up to the current concurrency limit
          // Use while loop since concurrency may have increased during warmup
          while (this.queue.length && this.inFlight < this.getCurrentConcurrency()) {
            const nextFn = this.queue.shift()!
            void this.push(nextFn)
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
   * Current concurrency limit based on warmup progress.
   */
  get currentConcurrency(): number {
    return this.getCurrentConcurrency()
  }
}

// Here we intentionally want it not async, as we don't want it to throw
// oxlint-disable-next-line typescript/promise-function-async
function runSafe<R>(fn: AsyncFunction<R>): Promise<R> {
  try {
    // Here we are intentionally not awaiting
    return fn()
  } catch (err) {
    // Handle synchronous throws
    return Promise.reject(err as Error)
  }
}

interface AsyncFunctionWithDefer<R = unknown> extends AsyncFunction<R> {
  defer: DeferredPromise<R>
}
