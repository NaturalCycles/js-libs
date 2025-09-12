import { Transform } from 'node:stream'
import type { AbortableSignal } from '@naturalcycles/js-lib'
import { _anyToError, _assert, ErrorMode } from '@naturalcycles/js-lib/error'
import { createCommonLoggerAtLevel } from '@naturalcycles/js-lib/log'
import type { IndexedMapper, Predicate, UnixTimestampMillis } from '@naturalcycles/js-lib/types'
import { END, SKIP } from '@naturalcycles/js-lib/types'
import { yellow } from '../../colors/colors.js'
import type { TransformOptions, TransformTyped } from '../stream.model.js'
import { PIPELINE_GRACEFUL_ABORT } from '../stream.util.js'
import type { TransformMapStats } from './transformMap.js'

export interface TransformMapSyncOptions<IN = any, OUT = IN> extends TransformOptions {
  /**
   * @default true
   */
  objectMode?: boolean

  /**
   * Predicate to filter outgoing results (after mapper).
   * Allows to not emit all results.
   *
   * Defaults to "pass everything".
   * Simpler way to skip individual entries is to return SKIP symbol.
   */
  predicate?: Predicate<OUT>

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
   * onDone callback will be called before Error is thrown.
   */
  onDone?: (stats: TransformMapStats) => any

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
 * Sync (not async) version of transformMap.
 * Supposedly faster, for cases when async is not needed.
 */
export function transformMapSync<IN = any, OUT = IN>(
  mapper: IndexedMapper<IN, OUT | typeof SKIP | typeof END>,
  opt: TransformMapSyncOptions = {},
): TransformTyped<IN, OUT> {
  const {
    predicate, // defaults to "no predicate" (pass everything)
    errorMode = ErrorMode.THROW_IMMEDIATELY,
    onError,
    onDone,
    metric = 'stream',
    objectMode = true,
    signal,
  } = opt

  const started = Date.now() as UnixTimestampMillis
  let index = -1
  let countOut = 0
  let isSettled = false
  let errors = 0
  const collectedErrors: Error[] = [] // only used if errorMode == THROW_AGGREGATED
  const logger = createCommonLoggerAtLevel(opt.logger, opt.logLevel)

  return new Transform({
    objectMode,
    ...opt,
    transform(chunk: IN, _, cb) {
      // Stop processing if isSettled
      if (isSettled) return cb()

      const currentIndex = ++index

      try {
        // map and pass through
        const v = mapper(chunk, currentIndex)

        if (v === END) {
          isSettled = true // will be checked later
          logger.log(`transformMapSync END received at index ${currentIndex}`)
          _assert(signal, 'signal is required when using END')
          signal.abort(new Error(PIPELINE_GRACEFUL_ABORT))
          return cb()
        }

        if (v === SKIP) {
          // do nothing, don't push
          return cb()
        }

        if (!predicate || predicate(v, currentIndex)) {
          countOut++
          this.push(v)
        }

        cb() // done processing
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

          try {
            onDone?.({
              ok: false,
              collectedErrors,
              countErrors: errors,
              countIn: index + 1,
              countOut,
              started,
            })
          } catch (err) {
            logger.error(err)
          }

          // Emit error immediately
          return cb(err as Error)
        }

        if (errorMode === ErrorMode.THROW_AGGREGATED) {
          collectedErrors.push(err as Error)
        }

        cb()
      }
    },
    final(cb) {
      // console.log('transformMap final')

      logErrorStats(true)

      if (collectedErrors.length) {
        try {
          onDone?.({
            ok: false,
            collectedErrors,
            countErrors: errors,
            countIn: index + 1,
            countOut,
            started,
          })
        } catch (err) {
          logger.error(err)
        }

        // emit Aggregated error
        cb(
          new AggregateError(
            collectedErrors,
            `transformMapSync resulted in ${collectedErrors.length} error(s)`,
          ),
        )
      } else {
        // emit no error

        try {
          onDone?.({
            ok: true,
            collectedErrors,
            countErrors: errors,
            countIn: index + 1,
            countOut,
            started,
          })
        } catch (err) {
          logger.error(err)
        }

        cb()
      }
    },
  })

  function logErrorStats(final = false): void {
    if (!errors) return

    logger.log(`${metric} ${final ? 'final ' : ''}errors: ${yellow(errors)}`)
  }
}
