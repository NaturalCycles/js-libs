import { Transform } from 'node:stream'
import type { AbortableSignal } from '@naturalcycles/js-lib'
import { _since } from '@naturalcycles/js-lib/datetime'
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

const WARMUP_CHECK_INTERVAL_MS = 1000

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
    concurrency: maxConcurrency = 16,
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
  let started = 0 as UnixTimestampMillis
  let index = -1
  let countOut = 0
  let isSettled = false
  let ok = true
  let errors = 0
  const collectedErrors: Error[] = []

  // Concurrency control - single counter, single callback for backpressure
  let inFlight = 0
  let blockedCallback: (() => void) | null = null
  let flushBlocked: DeferredPromise | null = null

  // Warmup - cached concurrency to reduce Date.now() syscalls
  let warmupComplete = warmupSeconds <= 0 || maxConcurrency <= 1
  let concurrency = warmupComplete ? maxConcurrency : 1
  let lastWarmupCheck = 0

  return new Transform({
    objectMode,
    readableHighWaterMark: highWaterMark,
    writableHighWaterMark: highWaterMark,
    async transform(this: Transform, chunk: IN, _, cb) {
      // Initialize start time on first item
      if (started === 0) {
        started = Date.now() as UnixTimestampMillis
        lastWarmupCheck = started
      }

      if (isSettled) return cb()

      const currentIndex = ++index
      inFlight++
      if (!warmupComplete) {
        updateConcurrency()
      }

      // Apply backpressure if at capacity, otherwise request more input
      if (inFlight < concurrency) {
        cb()
      } else {
        blockedCallback = cb
      }

      try {
        const res: OUT | typeof SKIP | typeof END = await mapper(chunk, currentIndex)

        if (isSettled) return

        if (res === END) {
          isSettled = true
          logger.log(`transformMap2 END received at index ${currentIndex}`)
          _assert(signal, 'signal is required when using END')
          signal.abort(new Error(PIPELINE_GRACEFUL_ABORT))
          return
        }

        if (res === SKIP) return

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
          await callOnDone()
          this.destroy(_anyToError(err))
          return
        }
        if (errorMode === ErrorMode.THROW_AGGREGATED) {
          collectedErrors.push(_anyToError(err))
        }
      } finally {
        inFlight--

        // Release blocked callback if we now have capacity
        if (blockedCallback && inFlight < concurrency) {
          const pendingCb = blockedCallback
          blockedCallback = null
          pendingCb()
        }

        // Trigger flush completion if all done
        if (inFlight === 0 && flushBlocked) {
          flushBlocked.resolve()
        }
      }
    },
    async flush(cb) {
      // Wait for all in-flight operations to complete
      if (inFlight > 0) {
        flushBlocked = pDefer()
        await flushBlocked
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

  function updateConcurrency(): void {
    const now = Date.now()
    if (now - lastWarmupCheck < WARMUP_CHECK_INTERVAL_MS) return
    lastWarmupCheck = now

    const elapsed = now - started
    if (elapsed >= warmupMs) {
      warmupComplete = true
      concurrency = maxConcurrency
      logger.log(`transformMap2: warmup complete in ${_since(started)}`)
      return
    }

    const progress = elapsed / warmupMs
    concurrency = Math.max(1, Math.floor(1 + (maxConcurrency - 1) * progress))
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
