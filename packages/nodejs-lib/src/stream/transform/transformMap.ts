import { _hc } from '@naturalcycles/js-lib'
import { _since } from '@naturalcycles/js-lib/datetime/time.util.js'
import { _anyToError, ErrorMode } from '@naturalcycles/js-lib/error'
import type { CommonLogger } from '@naturalcycles/js-lib/log'
import { pMap } from '@naturalcycles/js-lib/promise/pMap.js'
import { _stringify } from '@naturalcycles/js-lib/string/stringify.js'
import {
  type AbortableAsyncMapper,
  type AsyncPredicate,
  END,
  type Promisable,
  SKIP,
  type StringMap,
  type UnixTimestampMillis,
} from '@naturalcycles/js-lib/types'
import through2Concurrent from 'through2-concurrent'
import { yellow } from '../../colors/colors.js'
import type { AbortableTransform } from '../pipeline/pipeline.js'
import type { TransformTyped } from '../stream.model.js'
import { pipelineClose } from '../stream.util.js'

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
   * Defaults to "pass everything" (including null, undefined, etc).
   * Simpler way to exclude certain cases is to return SKIP symbol from the mapper.
   */
  predicate?: AsyncPredicate<OUT>

  /**
   * Number of concurrently pending promises returned by `mapper`.
   *
   * Default is 16.
   * It was recently changed up from 16, after some testing that shown that
   * for simple low-cpu mapper functions 32 produces almost 2x throughput.
   * For example, in scenarios like streaming a query from Datastore.
   * UPD: changed back from 32 to 16, "to be on a safe side", as 32 sometimes
   * causes "Datastore timeout errors".
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

  logger?: CommonLogger
}

export interface TransformMapStats {
  /**
   * True if transform was successful (didn't throw Immediate or Aggregated error).
   */
  ok: boolean
  /**
   * Only used (and returned) for ErrorMode.Aggregated
   */
  collectedErrors: Error[]
  countErrors: number
  countIn: number
  countOut: number
  started: UnixTimestampMillis
}

export interface TransformMapStatsSummary extends TransformMapStats {
  /**
   * Name of the summary, defaults to `Transform`
   */
  name?: string

  /**
   * Allows to pass extra key-value object, which will be rendered as:
   * key: value
   * key2: value2
   */
  extra?: StringMap<any>
}

// doesn't work, cause here we don't construct our Transform instance ourselves
// export class TransformMap extends AbortableTransform {}

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
export function transformMap<IN = any, OUT = IN>(
  mapper: AbortableAsyncMapper<IN, OUT | typeof SKIP | typeof END>,
  opt: TransformMapOptions<IN, OUT> = {},
): TransformTyped<IN, OUT> {
  const {
    concurrency = 16,
    predicate, // we now default to "no predicate" (meaning pass-everything)
    errorMode = ErrorMode.THROW_IMMEDIATELY,
    flattenArrayOutput,
    onError,
    onDone,
    metric = 'stream',
    logger = console,
  } = opt

  const started = Date.now() as UnixTimestampMillis
  let index = -1
  let countOut = 0
  let isSettled = false
  let errors = 0
  const collectedErrors: Error[] = [] // only used if errorMode == THROW_AGGREGATED

  return through2Concurrent.obj(
    {
      maxConcurrency: concurrency,
      async final(cb) {
        // console.log('transformMap final')

        logErrorStats(true)

        if (collectedErrors.length) {
          try {
            await onDone?.({
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
              `transformMap resulted in ${collectedErrors.length} error(s)`,
            ),
          )
        } else {
          // emit no error

          try {
            await onDone?.({
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
    },
    async function transformMapFn(this: AbortableTransform, chunk: IN, _, cb) {
      // Stop processing if isSettled (either THROW_IMMEDIATELY was fired or END received)
      if (isSettled) return cb()

      const currentIndex = ++index

      try {
        const res: OUT | typeof SKIP | typeof END = await mapper(chunk, currentIndex)
        // Check for isSettled again, as it may happen while mapper was running
        if (isSettled) return cb()
        // todo: consider retiring flattenArrayOutput from here
        // and implementing it as a separate .flat transform/operator
        const resInput = (flattenArrayOutput && Array.isArray(res) ? res : [res]) as (
          | OUT
          | typeof SKIP
          | typeof END
        )[]

        if (predicate) {
          await pMap(resInput, async r => {
            if (r === END) {
              isSettled = true // will be checked later
              return END
            }
            if (r === SKIP) return
            if (await predicate(r, currentIndex)) {
              if (isSettled) return END // isSettled could have happened in parallel
              countOut++
              this.push(r)
            }
          })
        } else {
          for (const r of resInput) {
            if (r === END) {
              isSettled = true // will be checked later
              break
            }
            if (r === SKIP) continue
            countOut++
            this.push(r)
          }
        }

        if (isSettled) {
          logger.log(`transformMap END received at index ${currentIndex}`)
          pipelineClose('transformMap', this, this.sourceReadable, this.streamDone, logger)
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
            await onDone?.({
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

          return cb(err) // Emit error immediately
        }

        if (errorMode === ErrorMode.THROW_AGGREGATED) {
          collectedErrors.push(err as Error)
        }

        // Tell input stream that we're done processing, but emit nothing to output - not error nor result
        cb()
      }
    },
  )

  function logErrorStats(final = false): void {
    if (!errors) return
    logger.log(`${metric} ${final ? 'final ' : ''}errors: ${yellow(errors)}`)
  }
}

/**
 * Renders TransformMapStatsSummary into a friendly string,
 * to be used e.g in Github Actions summary or Slack.
 */
export function transformMapStatsSummary(summary: TransformMapStatsSummary): string {
  const { countIn, countOut, countErrors, started, name = 'Transform', extra = {} } = summary

  return [
    `### ${name} summary\n`,
    `${_since(started)} spent`,
    `${_hc(countIn)} / ${_hc(countOut)} row(s) in / out`,
    countErrors ? `${countErrors} error(s)` : '',
    ...Object.entries(extra).map(([k, v]) => `${k}: ${_stringify(v)}`),
  ]
    .filter(Boolean)
    .join('\n')
}
