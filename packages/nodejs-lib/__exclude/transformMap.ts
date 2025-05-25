import { Transform } from 'stream'
import {
  AbortableAsyncMapper,
  AggregatedError,
  AsyncPredicate,
  CommonLogger,
  END,
  ErrorMode,
  pFilter,
  PQueue,
  SKIP,
} from '@naturalcycles/js-lib'
import { yellow } from '../../colors'
import { AbortableTransform } from '../pipeline/pipeline'
import { TransformTyped } from '../stream.model'
import { transformMapLegacy } from './legacy/transformMap'

export interface TransformMapOptions<IN = any, OUT = IN> {
  /**
   * Set true to support "multiMap" - possibility to return [] and emit 1 result for each item in the array.
   *
   * @default false
   */
  flattenArrayOutput?: boolean

  /**
   * Predicate to filter outgoing results (after mapper).
   * Allows to not emit all results.
   *
   * Set to `r => r` (passthrough predicate) to pass ANY value (including undefined/null)
   *
   * @default to filter out undefined/null values, but pass anything else
   */
  predicate?: AsyncPredicate<OUT>

  /**
   * Number of concurrently pending promises returned by `mapper`.
   *
   * @default 16 (to match default highWatermark option for objectMode streams)
   */
  concurrency?: number

  /**
   * @default THROW_IMMEDIATELY
   */
  errorMode?: ErrorMode

  /**
   * If defined - will be called on every error happening in the stream.
   * Called BEFORE observable will emit error (unless skipErrors is set to true).
   */
  onError?: (err: unknown, input: IN) => any

  /**
   * Progress metric
   *
   * @default `stream`
   */
  metric?: string

  /**
   * If defined - called BEFORE `final()` callback is called.
   */
  beforeFinal?: () => any

  logger?: CommonLogger
}

export function notNullishPredicate(item: any): boolean {
  return item !== undefined && item !== null
}

/**
 * Temporary export legacy transformMap, to debug 503 errors
 */
export const transformMap = transformMapLegacy

export class TransformMap extends AbortableTransform {}

/**
 * Like pMap, but for streams.
 * Inspired by `through2`.
 * Main feature is concurrency control (implemented via `through2-concurrent`) and convenient options.
 * Using this allows native stream .pipe() to work and use backpressure.
 *
 * Only works in objectMode (due to through2Concurrent).
 *
 * Concurrency defaults to 16.
 *
 * If an Array is returned by `mapper` - it will be flattened and multiple results will be emitted from it. Tested by Array.isArray().
 */
export function transformMapNew<IN = any, OUT = IN>(
  mapper: AbortableAsyncMapper<IN, OUT>,
  opt: TransformMapOptions<IN, OUT> = {},
): TransformTyped<IN, OUT> {
  const {
    concurrency = 16,
    predicate = notNullishPredicate,
    errorMode = ErrorMode.THROW_IMMEDIATELY,
    flattenArrayOutput,
    onError,
    beforeFinal,
    metric = 'stream',
    logger = console,
  } = opt

  let index = -1
  let isRejected = false
  let errors = 0
  const collectedErrors: Error[] = [] // only used if errorMode == THROW_AGGREGATED

  const q = new PQueue({
    concurrency,
    resolveOn: 'start',
    // debug: true,
  })

  return new TransformMap({
    objectMode: true,

    async final(cb) {
      // console.log('transformMap final', {index}, q.inFlight, q.queueSize)

      // wait for the current inFlight jobs to complete and push their results
      await q.onIdle()

      logErrorStats(logger, true)

      await beforeFinal?.() // call beforeFinal if defined

      if (collectedErrors.length) {
        // emit Aggregated error
        // For the same reason, magically, let's not call `cb`, but emit an error event instead
        // this.emit('error', new AggregatedError(collectedErrors))
        cb(new AggregatedError(collectedErrors))
      } else {
        // emit no error
        // It is truly a mistery, but calling cb() here was causing ERR_MULTIPLE_CALLBACK ?!
        // Commenting it out seems to work ?!
        // ?!
        // cb()
      }
    },

    async transform(this: TransformMap, chunk: IN, _encoding, cb) {
      index++
      // console.log('transform', {index})

      // Stop processing if THROW_IMMEDIATELY mode is used
      if (isRejected && errorMode === ErrorMode.THROW_IMMEDIATELY) return cb()

      // It resolves when it is successfully STARTED execution.
      // If it's queued instead - it'll wait and resolve only upon START.
      await q.push(async () => {
        try {
          const currentIndex = index // because we need to pass it to 2 functions - mapper and predicate. Refers to INPUT index (since it may return multiple outputs)
          const res = await mapper(chunk, currentIndex)
          const passedResults = await pFilter(
            flattenArrayOutput && Array.isArray(res) ? res : [res],
            async r => {
              if (r === END) throw new Error('END is not supported in transformMap yet')
              return r !== SKIP && (await predicate(r, currentIndex))
            },
          )

          passedResults.forEach(r => this.push(r))
        } catch (err) {
          logger.error(err)

          errors++

          logErrorStats(logger)

          if (onError) {
            try {
              onError(err, chunk)
            } catch {}
          }

          if (errorMode === ErrorMode.THROW_IMMEDIATELY) {
            isRejected = true
            // Emit error immediately
            // return cb(err as Error)
            return this.emit('error', err as Error)
          }

          if (errorMode === ErrorMode.THROW_AGGREGATED) {
            collectedErrors.push(err as Error)
          }
        }
      })

      // Resolved, which means it STARTED processing
      // This means we can take more load
      cb()
    },
  })

  function logErrorStats(logger: CommonLogger, final = false): void {
    if (!errors) return

    logger.log(`${metric} ${final ? 'final ' : ''}errors: ${yellow(errors)}`)
  }
}
