import { Transform } from 'node:stream'
import type { AbortableSignal } from '@naturalcycles/js-lib'
import { _anyToError, _assert, ErrorMode } from '@naturalcycles/js-lib/error'
import { createCommonLoggerAtLevel } from '@naturalcycles/js-lib/log'
import type { DeferredPromise } from '@naturalcycles/js-lib/promise'
import { pDefer } from '@naturalcycles/js-lib/promise/pDefer.js'
import {
  type AbortableAsyncMapper,
  type AsyncPredicate,
  END,
  type NumberOfSeconds,
  type PositiveInteger,
  type Predicate,
  type Promisable,
  SKIP,
  type UnixTimestampMillis,
} from '@naturalcycles/js-lib/types'
import { yellow } from '../../colors/colors.js'
import type { TransformOptions, TransformTyped } from '../stream.model.js'
import { PIPELINE_GRACEFUL_ABORT } from '../stream.util.js'
import type { TransformMapStats } from './transformMap.js'

export interface TransformMap2Options<IN = any, OUT = IN> extends TransformOptions {
  /**
   * Predicate to filter outgoing results (after mapper).
   * Allows to not emit all results.
   *
   * Defaults to "pass everything" (including null, undefined, etc).
   * Simpler way to exclude certain cases is to return SKIP symbol from the mapper.
   */
  predicate?: Predicate<OUT>

  asyncPredicate?: AsyncPredicate<OUT>

  /**
   * Number of concurrently pending promises returned by `mapper`.
   *
   * @default 16
   */
  concurrency?: PositiveInteger

  /**
   * Time in seconds to gradually increase concurrency from 1 to `concurrency`.
   * Useful for warming up connections to databases, APIs, etc.
   *
   * Set to 0 to disable warmup (default).
   */
  warmupSeconds?: NumberOfSeconds

  /**
   * @default THROW_IMMEDIATELY
   */
  errorMode?: ErrorMode

  /**
   * If defined - will be called on every error happening in the stream.
   * Called BEFORE observable will emit error (unless skipErrors is set to true).
   */
  onError?: (err: Error, input: IN) => any

  /**
   * A hook that is called when the last item is finished processing.
   * stats object is passed, containing countIn and countOut -
   * number of items that entered the transform and number of items that left it.
   *
   * Callback is called **before** [possible] Aggregated error is thrown,
   * and before [possible] THROW_IMMEDIATELY error.
   *
   * onDone callback will be awaited before Error is thrown.
   */
  onDone?: (stats: TransformMapStats) => Promisable<any>

  /**
   * Progress metric
   *
   * @default `stream`
   */
  metric?: string

  /**
   * Allows to abort (gracefully stop) the stream from inside the Transform.
   */
  signal?: AbortableSignal
}

/**
 * Like transformMap, but with native concurrency control (no through2-concurrent dependency)
 * and support for gradual warmup.
 *
 * @experimental
 */
export function transformMap2<IN = any, OUT = IN>(
  mapper: AbortableAsyncMapper<IN, OUT | typeof SKIP | typeof END>,
  opt: TransformMap2Options<IN, OUT> = {},
): TransformTyped<IN, OUT> {
  const {
    concurrency = 16,
    warmupSeconds = 0,
    predicate,
    asyncPredicate,
    errorMode = ErrorMode.THROW_IMMEDIATELY,
    onError,
    onDone,
    metric = 'stream',
    signal,
    objectMode = true,
    highWaterMark = 64,
  } = opt

  const warmupMs = warmupSeconds * 1000
  const logger = createCommonLoggerAtLevel(opt.logger, opt.logLevel)

  // Stats
  const started = Date.now() as UnixTimestampMillis
  let index = -1
  let countOut = 0
  let isSettled = false
  let ok = true
  let errors = 0
  const collectedErrors: Error[] = []

  // Concurrency control
  let startTime = 0
  let warmupComplete = warmupSeconds <= 0 || concurrency <= 1
  let inFlight = 0
  const waiters: DeferredPromise[] = []

  // Track pending operations for proper flush
  let pendingOperations = 0

  return new Transform({
    objectMode,
    readableHighWaterMark: highWaterMark,
    writableHighWaterMark: highWaterMark,
    async transform(this: Transform, chunk: IN, _, cb) {
      // Initialize start time on first item
      if (startTime === 0) {
        startTime = Date.now()
      }

      // Stop processing if isSettled
      if (isSettled) return cb()

      const currentIndex = ++index
      const currentConcurrency = getCurrentConcurrency()

      // Wait for a slot if at capacity
      if (inFlight >= currentConcurrency) {
        const waiter = pDefer()
        waiters.push(waiter)
        await waiter
      } else {
        inFlight++
      }

      // Signal that we're ready for more input
      cb()

      // Track this operation
      pendingOperations++

      // Process the item asynchronously
      try {
        const res: OUT | typeof SKIP | typeof END = await mapper(chunk, currentIndex)

        if (isSettled) {
          release()
          pendingOperations--
          return
        }

        if (res === END) {
          isSettled = true
          logger.log(`transformMap2 END received at index ${currentIndex}`)
          _assert(signal, 'signal is required when using END')
          signal.abort(new Error(PIPELINE_GRACEFUL_ABORT))
          release()
          pendingOperations--
          return
        }

        if (res === SKIP) {
          release()
          pendingOperations--
          return
        }

        let shouldPush = true
        if (predicate) {
          shouldPush = predicate(res, currentIndex)
        } else if (asyncPredicate) {
          shouldPush = (await asyncPredicate(res, currentIndex)) && !isSettled
        }

        if (shouldPush) {
          countOut++
          this.push(res)
        }
      } catch (err) {
        logger.error(err)
        errors++
        logErrorStats()

        if (onError) {
          try {
            onError(_anyToError(err), chunk)
          } catch {}
        }

        if (errorMode === ErrorMode.THROW_IMMEDIATELY) {
          isSettled = true
          ok = false
          // Call onDone before destroying, since flush won't be called
          await callOnDone()
          this.destroy(_anyToError(err))
        } else if (errorMode === ErrorMode.THROW_AGGREGATED) {
          collectedErrors.push(_anyToError(err))
        }
      } finally {
        release()
        pendingOperations--
      }
    },
    async flush(cb) {
      // Wait for all pending operations to complete
      // Polling is simple and race-condition-free
      // Timeout prevents infinite loop if something goes wrong
      const flushStart = Date.now()
      const flushTimeoutMs = 60_000
      while (pendingOperations > 0) {
        await new Promise(resolve => setImmediate(resolve))
        if (Date.now() - flushStart > flushTimeoutMs) {
          logger.error(
            `transformMap2 flush timeout: ${pendingOperations} operations still pending after ${flushTimeoutMs}ms`,
          )
          break
        }
      }

      logErrorStats(true)
      await callOnDone()

      if (collectedErrors.length) {
        cb(
          new AggregateError(
            collectedErrors,
            `transformMap2 resulted in ${collectedErrors.length} error(s)`,
          ),
        )
      } else {
        cb()
      }
    },
  })

  function getCurrentConcurrency(): number {
    if (warmupComplete) return concurrency

    const elapsed = Date.now() - startTime
    if (elapsed >= warmupMs) {
      warmupComplete = true
      logger.debug('warmup complete')
      return concurrency
    }

    const progress = elapsed / warmupMs
    return Math.max(1, Math.floor(1 + (concurrency - 1) * progress))
  }

  function release(): void {
    inFlight--
    const currentConcurrency = getCurrentConcurrency()
    while (waiters.length && inFlight < currentConcurrency) {
      inFlight++
      waiters.shift()!.resolve()
    }
  }

  function logErrorStats(final = false): void {
    if (!errors) return
    logger.log(`${metric} ${final ? 'final ' : ''}errors: ${yellow(errors)}`)
  }

  async function callOnDone(): Promise<void> {
    try {
      await onDone?.({
        ok: collectedErrors.length === 0 && ok,
        collectedErrors,
        countErrors: errors,
        countIn: index + 1,
        countOut,
        started,
      })
    } catch (err) {
      logger.error(err)
    }
  }
}
