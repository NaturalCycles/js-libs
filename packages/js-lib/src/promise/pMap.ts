import { ErrorMode } from '../error/errorMode.js'
import type { CommonLogger } from '../log/commonLogger.js'
import { END, SKIP } from '../types.js'
import type { AbortableAsyncMapper } from '../types.js'

export interface PMapOptions {
  /**
   * Number of concurrently pending promises returned by `mapper`.
   *
   * Defaults to Infitity.
   */
  concurrency?: number

  /**
   * @default ErrorMode.THROW_IMMEDIATELY
   *
   * When set to THROW_AGGREGATED, instead of stopping when a promise rejects, it will wait for all the promises to settle and then reject with an Aggregated error.
   *
   * When set to SUPPRESS - will ignore errors and return results from successful operations.
   * When in SUPPRESS - errors are still logged via the `logger` (which defaults to console).
   */
  errorMode?: ErrorMode

  /**
   * Default to `console`.
   * Pass `null` to skip logging completely.
   */
  logger?: CommonLogger | null
}

/**
 * Forked from https://github.com/sindresorhus/p-map
 *
 * Improvements:
 * - Exported as { pMap }, so IDE auto-completion works
 * - Included Typescript typings (no need for @types/p-map)
 * - Compatible with pProps (that had typings issues)
 * - Preserves async stack traces (in selected cases)
 *
 * Returns a `Promise` that is fulfilled when all promises in `input` and ones returned from `mapper` are fulfilled,
 * or rejects if any of the promises reject. The fulfilled value is an `Array` of the fulfilled values returned
 * from `mapper` in `input` order.
 *
 * @param iterable - Iterated over concurrently in the `mapper` function.
 * @param mapper - Function which is called for every item in `input`. Expected to return a `Promise` or value.
 * @param opt - Options-object.
 *
 * @example
 *
 * const sites = [
 * 	'ava.li',
 * 	'todomvc.com
 * ];
 *
 * (async () => {
 * 	const mapper = async site => {
 * 		const {requestUrl} = await got.head(site);
 * 		return requestUrl;
 * 	};
 *
 * 	const result = await pMap(sites, mapper, {concurrency: 2});
 * 	//=> ['http://ava.li/', 'http://todomvc.com/']
 * })();
 */
export async function pMap<IN, OUT>(
  iterable: Iterable<IN>,
  mapper: AbortableAsyncMapper<IN, OUT>,
  opt: PMapOptions = {},
): Promise<OUT[]> {
  const items = [...iterable]
  const itemsLength = items.length
  if (itemsLength === 0) return [] // short circuit

  const { concurrency = Infinity, errorMode = ErrorMode.THROW_IMMEDIATELY, logger = console } = opt

  // Special cases that are able to preserve async stack traces
  // Special case: serial execution
  if (concurrency === 1) {
    return await pMap1(items, mapper, errorMode, logger)
  }

  // Special case: items.length <= concurrency (including when concurrency === Infinity)
  if (items.length <= concurrency) {
    return await pMapAll(items, mapper, errorMode, logger)
  }

  // General case: execution with throttled concurrency
  const ret: (OUT | typeof SKIP)[] = []
  const errors: Error[] = []
  let isSettled = false
  let resolvingCount = 0
  let currentIndex = 0

  return await new Promise<OUT[]>((resolve, reject) => {
    const next = (): void => {
      if (isSettled) {
        return
      }

      const nextItem = items[currentIndex]!
      const i = currentIndex++

      if (currentIndex > itemsLength) {
        if (resolvingCount === 0) {
          isSettled = true
          const r = ret.filter(r => r !== SKIP) as OUT[]
          if (errors.length) {
            reject(new AggregateError(errors, `pMap resulted in ${errors.length} error(s)`))
          } else {
            resolve(r)
          }
        }

        return
      }

      resolvingCount++

      Promise.resolve(nextItem)
        .then(async element => await mapper(element, i))
        .then(
          value => {
            if (value === END) {
              isSettled = true
              return resolve(ret.filter(r => r !== SKIP) as OUT[])
            }

            ret[i] = value
            resolvingCount--
            next() // oxlint-disable-line no-callback-in-promise
          },
          (err: Error) => {
            if (errorMode === ErrorMode.THROW_IMMEDIATELY) {
              isSettled = true
              reject(err)
            } else {
              if (errorMode === ErrorMode.THROW_AGGREGATED) {
                errors.push(err)
              } else {
                // otherwise, suppress (but still log via logger)
                logger?.error(err)
              }
              resolvingCount--
              next() // oxlint-disable-line no-callback-in-promise
            }
          },
        )
    }

    for (let i = 0; i < concurrency; i++) {
      next()

      if (isSettled) {
        break
      }
    }
  })
}

/**
 pMap with serial (non-concurrent) execution.
 */
async function pMap1<IN, OUT>(
  items: IN[],
  mapper: AbortableAsyncMapper<IN, OUT>,
  errorMode: ErrorMode,
  logger: CommonLogger | null,
): Promise<OUT[]> {
  let i = 0
  const ret: OUT[] = []
  const errors: Error[] = []

  for (const item of items) {
    try {
      const r = await mapper(item, i++)
      if (r === END) break
      if (r !== SKIP) ret.push(r)
    } catch (err) {
      if (errorMode === ErrorMode.THROW_IMMEDIATELY) throw err
      if (errorMode === ErrorMode.THROW_AGGREGATED) {
        errors.push(err as Error)
      } else {
        // otherwise, suppress (but still log via logger)
        logger?.error(err)
      }
    }
  }

  if (errors.length) {
    throw new AggregateError(errors, `pMap resulted in ${errors.length} error(s)`)
  }

  return ret
}

/**
 pMap with fully concurrent execution, like Promise.all
 */
async function pMapAll<IN, OUT>(
  items: IN[],
  mapper: AbortableAsyncMapper<IN, OUT>,
  errorMode: ErrorMode,
  logger: CommonLogger | null,
): Promise<OUT[]> {
  if (errorMode === ErrorMode.THROW_IMMEDIATELY) {
    return (await Promise.all(items.map((item, i) => mapper(item, i)))).filter(
      r => r !== SKIP && r !== END,
    ) as OUT[]
  }

  const ret: OUT[] = []
  const errors: Error[] = []

  for (const r of await Promise.allSettled(items.map((item, i) => mapper(item, i)))) {
    if (r.status === 'fulfilled') {
      if (r.value === END) break
      if (r.value !== SKIP) ret.push(r.value)
    } else if (errorMode === ErrorMode.THROW_AGGREGATED) {
      errors.push(r.reason)
    } else {
      // otherwise, suppress (but still log via logger)
      logger?.error(r.reason)
    }
  }

  if (errors.length) {
    throw new AggregateError(errors, `pMap resulted in ${errors.length} error(s)`)
  }

  return ret
}
