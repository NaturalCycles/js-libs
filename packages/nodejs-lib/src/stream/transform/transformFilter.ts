import { Transform } from 'node:stream'
import type { AsyncPredicate, Predicate } from '@naturalcycles/js-lib/types'
import type { TransformOptions, TransformTyped } from '../stream.model.js'
import type { TransformMapOptions } from './transformMap.js'
import { transformMap } from './transformMap.js'

/**
 * Just a convenience wrapper around `transformMap` that has built-in predicate filtering support.
 */
export function transformFilter<IN = any>(
  predicate: AsyncPredicate<IN>,
  opt: TransformMapOptions = {},
): TransformTyped<IN, IN> {
  return transformMap(v => v, {
    predicate,
    ...opt,
  })
}

/**
 * Sync version of `transformFilter`
 */
export function transformFilterSync<IN = any>(
  predicate: Predicate<IN>,
  opt: TransformOptions = {},
): TransformTyped<IN, IN> {
  let index = 0

  return new Transform({
    objectMode: true,
    ...opt,
    transform(chunk: IN, _, cb) {
      try {
        if (predicate(chunk, index++)) {
          cb(null, chunk) // pass through
        } else {
          cb() // signal that we've finished processing, but emit no output here
        }
      } catch (err) {
        cb(err as Error)
      }
    },
  })
}
