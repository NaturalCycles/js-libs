import type {
  CommonLogger,
  IndexedMapper,
  Predicate,
  UnixTimestampMillis,
} from '@naturalcycles/js-lib'
import { _anyToError, END, ErrorMode, SKIP } from '@naturalcycles/js-lib'
import { yellow } from '../../colors/colors.js'
import { AbortableTransform } from '../pipeline/pipeline.js'
import type { TransformTyped } from '../stream.model.js'
import { pipelineClose } from '../stream.util.js'
import type { TransformMapStats } from './transformMap.js'

export interface TransformMapSyncOptions<IN = any, OUT = IN> {
  /**
   * @default true
   */
  objectMode?: boolean

  /**
   * @default false
   * Set true to support "multiMap" - possibility to return [] and emit 1 result for each item in the array.
   */
  flattenArrayOutput?: boolean

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

  logger?: CommonLogger
}

export class TransformMapSync extends AbortableTransform {}

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
    flattenArrayOutput = false,
    onError,
    onDone,
    metric = 'stream',
    objectMode = true,
    logger = console,
  } = opt

  const started = Date.now() as UnixTimestampMillis
  let index = -1
  let countOut = 0
  let isSettled = false
  let errors = 0
  const collectedErrors: Error[] = [] // only used if errorMode == THROW_AGGREGATED

  return new TransformMapSync({
    objectMode,
    ...opt,
    transform(this: AbortableTransform, chunk: IN, _, cb) {
      // Stop processing if isSettled
      if (isSettled) return cb()

      const currentIndex = ++index

      try {
        // map and pass through
        const v = mapper(chunk, currentIndex)

        const passedResults = (flattenArrayOutput && Array.isArray(v) ? v : [v]).filter(r => {
          if (r === END) {
            isSettled = true // will be checked later
            return false
          }
          return r !== SKIP && (!predicate || predicate(r, currentIndex))
        })

        countOut += passedResults.length
        passedResults.forEach(r => this.push(r))

        if (isSettled) {
          logger.log(`transformMapSync END received at index ${currentIndex}`)
          pipelineClose('transformMapSync', this, this.sourceReadable, this.streamDone, logger)
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
