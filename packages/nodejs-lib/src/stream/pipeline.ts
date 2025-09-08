import { Readable, type Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createGzip } from 'node:zlib'
import { createAbortableSignal } from '@naturalcycles/js-lib'
import type {
  AbortableAsyncMapper,
  AsyncIndexedMapper,
  AsyncPredicate,
  END,
  IndexedMapper,
  Integer,
  NonNegativeInteger,
  PositiveInteger,
  Predicate,
  SKIP,
} from '@naturalcycles/js-lib/types'
import { fs2 } from '../fs/fs2.js'
import { createReadStreamAsNDJSON } from './ndjson/createReadStreamAsNDJSON.js'
import { transformToNDJson } from './ndjson/transformToNDJson.js'
import type {
  ReadableTyped,
  TransformOptions,
  TransformTyped,
  WritableTyped,
} from './stream.model.js'
import { PIPELINE_GRACEFUL_ABORT } from './stream.util.js'
import { transformChunk } from './transform/transformChunk.js'
import { transformFilterSync } from './transform/transformFilter.js'
import { transformFlatten, transformFlattenIfNeeded } from './transform/transformFlatten.js'
import { transformLimit } from './transform/transformLimit.js'
import {
  transformLogProgress,
  type TransformLogProgressOptions,
} from './transform/transformLogProgress.js'
import { transformMap, type TransformMapOptions } from './transform/transformMap.js'
import {
  transformMapSimple,
  type TransformMapSimpleOptions,
} from './transform/transformMapSimple.js'
import { transformMapSync, type TransformMapSyncOptions } from './transform/transformMapSync.js'
import { transformOffset, type TransformOffsetOptions } from './transform/transformOffset.js'
import { transformTap, type TransformTapOptions } from './transform/transformTap.js'
import { transformThrottle, type TransformThrottleOptions } from './transform/transformThrottle.js'
import { writablePushToArray } from './writable/writablePushToArray.js'
import { writableVoid } from './writable/writableVoid.js'

export class Pipeline<T> {
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: ok
  private readonly source: Readable
  private transforms: NodeJS.ReadWriteStream[] = []
  private destination?: NodeJS.WritableStream
  private readableLimit?: Integer
  private abortableSignal = createAbortableSignal()

  private constructor(source: ReadableTyped<T>) {
    this.source = source
  }

  static from<T>(source: ReadableTyped<T>): Pipeline<T> {
    return new Pipeline(source)
  }

  /**
   * Technically same as `fromIterable` (since Array is Iterable),
   * but named a bit friendlier.
   */
  static fromArray<T>(input: T[]): Pipeline<T> {
    return new Pipeline(Readable.from(input))
  }

  static fromIterable<T>(input: Iterable<T> | AsyncIterable<T>): Pipeline<T> {
    return new Pipeline(Readable.from(input))
  }

  static fromNDJsonFile<T>(sourceFilePath: string): Pipeline<T> {
    return new Pipeline(createReadStreamAsNDJSON<T>(sourceFilePath))
  }

  /**
   * Limits the source Readable, but using `.take(limit)` on it.
   * This is THE preferred way of limiting the source.
   */
  limitSource(limit: NonNegativeInteger | undefined): this {
    this.readableLimit = limit
    return this
  }

  /**
   * If possible - STRONGLY PREFER applying `.take(limit)` on the source Readable,
   * as it's a clean graceful way of limiting the Readable. Example:
   *
   * Pipeline.from(myReadable.take(10))
   *
   * or
   *
   * Pipeline
   *   .from(myReadable)
   *   .limitSource(10)
   *
   * If applying `take` on Readable is not possible - use this method at your own risk.
   * Why warning?
   * The limit works by aborting the stream, and then catching the error - certainly
   * less clean than `.take()` on the source.
   */
  limit(limit: NonNegativeInteger | undefined): this {
    this.transforms.push(
      transformLimit({
        limit,
        signal: this.abortableSignal,
      }),
    )
    return this
  }

  chunk(chunkSize: PositiveInteger, opt?: TransformOptions): Pipeline<T[]> {
    this.transforms.push(transformChunk(chunkSize, opt))
    return this as any
  }

  flatten<TO>(this: Pipeline<readonly TO[]>): Pipeline<TO> {
    this.transforms.push(transformFlatten())
    return this as any
  }

  flattenIfNeeded(): Pipeline<T extends readonly (infer TO)[] ? TO : T> {
    this.transforms.push(transformFlattenIfNeeded())
    return this as any
  }

  // TransformLogProgressOptions intentionally doesn't have <T> passed, as it's inconvenient in many cases
  logProgress(opt?: TransformLogProgressOptions): this {
    this.transforms.push(transformLogProgress(opt))
    return this
  }

  map<TO>(
    mapper: AbortableAsyncMapper<T, TO | typeof SKIP | typeof END>,
    opt?: TransformMapOptions<T, TO>,
  ): Pipeline<TO> {
    this.transforms.push(
      transformMap(mapper, {
        ...opt,
        signal: this.abortableSignal,
      }),
    )
    return this as any
  }

  mapSync<TO>(
    mapper: IndexedMapper<T, TO | typeof SKIP | typeof END>,
    opt?: TransformMapSyncOptions,
  ): Pipeline<TO> {
    this.transforms.push(
      transformMapSync(mapper, {
        ...opt,
        signal: this.abortableSignal,
      }),
    )
    return this as any
  }

  mapSimple<TO>(mapper: IndexedMapper<T, TO>, opt?: TransformMapSimpleOptions): Pipeline<TO> {
    this.transforms.push(transformMapSimple(mapper, opt))
    return this as any
  }

  filter(predicate: AsyncPredicate<T>, opt?: TransformMapOptions): this {
    this.transforms.push(
      transformMap(v => v, {
        predicate,
        ...opt,
        signal: this.abortableSignal,
      }),
    )
    return this
  }

  filterSync(predicate: Predicate<T>, opt?: TransformOptions): this {
    this.transforms.push(transformFilterSync(predicate, opt))
    return this
  }

  offset(opt: TransformOffsetOptions): this {
    this.transforms.push(transformOffset(opt))
    return this
  }

  tap(fn: AsyncIndexedMapper<T, any>, opt?: TransformTapOptions): this {
    this.transforms.push(transformTap(fn, opt))
    return this
  }

  throttle(opt: TransformThrottleOptions): this {
    this.transforms.push(transformThrottle(opt))
    return this
  }

  // todo: tee/fork

  transform<TO>(transform: TransformTyped<T, TO>): Pipeline<TO> {
    this.transforms.push(transform)
    return this as any
  }

  /**
   * Helper method to add multiple transforms at once.
   * Not type safe! Prefer using singular `transform()` multiple times for type safety.
   */
  transformMany<TO>(transforms: Transform[]): Pipeline<TO> {
    this.transforms.push(...transforms)
    return this as any
  }

  /**
   * Utility method just to conveniently type-cast the current Pipeline type.
   * No runtime effect.
   */
  typeCastAs<TO>(): Pipeline<TO> {
    return this as any
  }

  async toArray(opt?: TransformOptions): Promise<T[]> {
    const arr: T[] = []
    this.destination = writablePushToArray(arr, opt)
    await this.run()
    return arr
  }

  async toFile(outputFilePath: string): Promise<void> {
    fs2.ensureFile(outputFilePath)
    this.destination = fs2.createWriteStream(outputFilePath)
    await this.run()
  }

  async toNDJsonFile(outputFilePath: string): Promise<void> {
    fs2.ensureFile(outputFilePath)
    this.transforms.push(transformToNDJson())
    if (outputFilePath.endsWith('.gz')) {
      this.transforms.push(
        createGzip({
          // chunkSize: 64 * 1024, // no observed speedup
        }),
      )
    }
    this.destination = fs2.createWriteStream(outputFilePath, {
      // highWaterMark: 64 * 1024, // no observed speedup
    })
    await this.run()
  }

  async to(destination: WritableTyped<T>): Promise<void> {
    this.destination = destination
    await this.run()
  }

  async forEach(
    fn: AsyncIndexedMapper<T, void>,
    opt?: TransformMapOptions<T, void>,
  ): Promise<void> {
    this.transforms.push(
      transformMap(fn, {
        ...opt,
        signal: this.abortableSignal,
      }),
    )
    await this.run()
  }

  async forEachSync(
    fn: IndexedMapper<T, void>,
    opt?: TransformMapSyncOptions<T, void>,
  ): Promise<void> {
    this.transforms.push(
      transformMapSync(fn, {
        ...opt,
        signal: this.abortableSignal,
      }),
    )
    await this.run()
  }

  async run(): Promise<void> {
    this.destination ||= writableVoid()
    let { source } = this
    if (this.readableLimit) {
      source = source.take(this.readableLimit)
    }

    try {
      await pipeline([source, ...this.transforms, this.destination], {
        signal: this.abortableSignal,
      })
    } catch (err) {
      if (err instanceof Error && (err.cause as any)?.message === PIPELINE_GRACEFUL_ABORT) {
        console.log('pipeline gracefully aborted') // todo: this message may be removed later
        return
      }
      throw err
    }
  }
}
