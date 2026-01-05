import { Readable, type Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream as WebReadableStream } from 'node:stream/web'
import {
  createGzip,
  createUnzip,
  createZstdCompress,
  createZstdDecompress,
  type ZlibOptions,
  type ZstdOptions,
} from 'node:zlib'
import { createAbortableSignal } from '@naturalcycles/js-lib'
import {
  _passthroughPredicate,
  type AbortableAsyncMapper,
  type AsyncIndexedMapper,
  type AsyncPredicate,
  type END,
  type IndexedMapper,
  type Integer,
  type NonNegativeInteger,
  type PositiveInteger,
  type Predicate,
  type SKIP,
} from '@naturalcycles/js-lib/types'
import { fs2 } from '../fs/fs2.js'
import { zstdLevelToOptions } from '../zip/zip.util.js'
import { createReadStreamAsNDJson } from './ndjson/createReadStreamAsNDJson.js'
import { transformJsonParse } from './ndjson/transformJsonParse.js'
import { transformToNDJson } from './ndjson/transformToNDJson.js'
import { createReadableFromAsync } from './readable/createReadable.js'
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
// oxlint-disable-next-line import/no-cycle -- intentional cycle
import { transformFork } from './transform/transformFork.js'
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
import { transformSplitOnNewline } from './transform/transformSplit.js'
import { transformTap, transformTapSync } from './transform/transformTap.js'
import { transformThrottle, type TransformThrottleOptions } from './transform/transformThrottle.js'
import { transformWarmup, type TransformWarmupOptions } from './transform/transformWarmup.js'
import { writablePushToArray } from './writable/writablePushToArray.js'
import { writableVoid } from './writable/writableVoid.js'

export class Pipeline<T = unknown> {
  private readonly source: Readable
  private transforms: NodeJS.ReadWriteStream[] = []
  private destination?: NodeJS.WritableStream
  private readableLimit?: Integer

  private objectMode: boolean
  private abortableSignal = createAbortableSignal()

  private constructor(source: ReadableTyped<T>, objectMode = true) {
    this.source = source
    this.objectMode = objectMode
  }

  static from<T>(source: ReadableTyped<T>): Pipeline<T> {
    return new Pipeline(source)
  }

  /**
   * Useful in cases when Readable is not immediately available,
   * but only available after an async operation is completed.
   * Implemented via a proxy Transform, which should be transparent.
   */
  static fromAsyncReadable<T = unknown>(fn: () => Promise<ReadableTyped<T>>): Pipeline<T> {
    return new Pipeline(createReadableFromAsync(fn))
  }

  static fromWeb<T>(webReadableStream: WebReadableStream<T>): Pipeline<T> {
    return new Pipeline(Readable.fromWeb(webReadableStream))
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
    // Important that createReadStreamAsNDJson function is used
    // (and not Pipeline set of individual transforms),
    // because createReadStreamAsNDJson returns a Readable,
    // hence it allows to apply .take(limit) on it
    // e.g like Pipeline.fromNDJsonFile().limitSource(limit)
    return new Pipeline<T>(createReadStreamAsNDJson(sourceFilePath))
  }

  static fromFile(sourceFilePath: string): Pipeline<Uint8Array> {
    return new Pipeline(
      fs2.createReadStream(sourceFilePath, {
        highWaterMark: 64 * 1024, // no observed speedup
      }),
      false,
    )
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
    if (!this.transforms.length) {
      console.warn(
        `Pipeline.limit was used as a very first Transfrom - please use Pipeline.limitSource instead`,
      )
      this.limitSource(limit)
      return this
    }

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

  filter(asyncPredicate: AsyncPredicate<T>, opt?: TransformMapOptions): this {
    this.transforms.push(
      transformMap(v => v, {
        asyncPredicate,
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

  tap(fn: AsyncIndexedMapper<T, any>, opt?: TransformOptions): this {
    this.transforms.push(transformTap(fn, opt))
    return this
  }

  tapSync(fn: IndexedMapper<T, any>, opt?: TransformOptions): this {
    this.transforms.push(transformTapSync(fn, opt))
    return this
  }

  throttle(opt: TransformThrottleOptions): this {
    this.transforms.push(transformThrottle(opt))
    return this
  }

  /**
   * @experimental to be removed after transformMap2 is stable
   */
  warmup(opt: TransformWarmupOptions): this {
    this.transforms.push(transformWarmup(opt))
    return this
  }

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

  fork(fn: (pipeline: Pipeline<T>) => Promise<void>, opt?: TransformOptions): this {
    this.transforms.push(transformFork(fn, opt))
    return this
  }

  /**
   * Utility method just to conveniently type-cast the current Pipeline type.
   * No runtime effect.
   */
  typeCastAs<TO>(): Pipeline<TO> {
    return this as any
  }

  setObjectMode(objectMode: boolean): this {
    this.objectMode = objectMode
    return this
  }

  /**
   * Transform the stream of Objects into a stream of JSON lines.
   * Technically, it goes into objectMode=false, so it's a binary stream at the end.
   */
  toNDJson(): Pipeline<Uint8Array> {
    this.transforms.push(transformToNDJson())
    this.objectMode = false
    return this as any
  }

  parseNDJson<TO = unknown>(this: Pipeline<Uint8Array>): Pipeline<TO> {
    // It was said that transformJsonParse() separately is 10% or more slower than .map(line => JSON.parse(line))
    // So, we can investigate a speedup
    this.transforms.push(transformSplitOnNewline(), transformJsonParse())
    this.objectMode = true
    return this as any
  }

  splitOnNewline(this: Pipeline<Uint8Array>): Pipeline<Buffer> {
    // Input: objectMode=false - binary stream
    // Output: objectMode=true - stream of Buffer objects (which are also strings?)
    this.transforms.push(transformSplitOnNewline())
    this.objectMode = true
    return this as any
  }

  parseJson<TO = unknown>(
    this: Pipeline<Buffer> | Pipeline<Uint8Array> | Pipeline<string>,
  ): Pipeline<TO> {
    // Input: objectMode=false - takes a stream of strings one by one
    // Output: objectMode=true - stream of json-parsed Objects
    this.transforms.push(transformJsonParse())
    this.objectMode = true
    return this as any
  }

  gzip(this: Pipeline<Uint8Array>, opt?: ZlibOptions): Pipeline<Uint8Array> {
    this.transforms.push(
      createGzip({
        // chunkSize: 64 * 1024, // no observed speedup
        ...opt,
      }),
    )
    this.objectMode = false
    return this as any
  }

  gunzip(this: Pipeline<Uint8Array>, opt?: ZlibOptions): Pipeline<Uint8Array> {
    this.transforms.push(
      createUnzip({
        chunkSize: 64 * 1024, // speedup from ~3200 to 3800 rps!
        ...opt,
      }),
    )
    this.objectMode = false
    return this as any
  }

  zstdCompress(
    this: Pipeline<Uint8Array>,
    level?: Integer, // defaults to 3
    opt?: ZstdOptions,
  ): Pipeline<Uint8Array> {
    this.transforms.push(createZstdCompress(zstdLevelToOptions(level, opt)))
    this.objectMode = false
    return this as any
  }

  zstdDecompress(this: Pipeline<Uint8Array>, opt?: ZstdOptions): Pipeline<Uint8Array> {
    this.transforms.push(
      createZstdDecompress({
        chunkSize: 64 * 1024, // todo: test it
        ...opt,
      }),
    )
    this.objectMode = false
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

  /**
   * level corresponds to zstd compression level (if filename ends with .zst),
   * or gzip compression level (if filename ends with .gz).
   * Default levels are:
   * gzip: 6
   * zlib: 3 (optimized for throughput, not size, may be larger than gzip at its default level)
   */
  async toNDJsonFile(outputFilePath: string, level?: Integer): Promise<void> {
    fs2.ensureFile(outputFilePath)
    this.transforms.push(transformToNDJson())
    if (outputFilePath.endsWith('.gz')) {
      this.transforms.push(
        createGzip({
          level,
          // chunkSize: 64 * 1024, // no observed speedup
        }),
      )
    } else if (outputFilePath.endsWith('.zst')) {
      this.transforms.push(createZstdCompress(zstdLevelToOptions(level)))
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
    opt: TransformMapOptions<T, void> & TransformLogProgressOptions<T> = {},
  ): Promise<void> {
    this.transforms.push(
      transformMap(fn, {
        predicate: opt.logEvery ? _passthroughPredicate : undefined, // for the logger to work
        ...opt,
        signal: this.abortableSignal,
      }),
    )
    if (opt.logEvery) {
      this.transforms.push(transformLogProgress(opt))
    }
    await this.run()
  }

  async forEachSync(
    fn: IndexedMapper<T, void>,
    opt: TransformMapSyncOptions<T, void> & TransformLogProgressOptions<T> = {},
  ): Promise<void> {
    this.transforms.push(
      transformMapSync(fn, {
        predicate: opt.logEvery ? _passthroughPredicate : undefined, // for the logger to work
        ...opt,
        signal: this.abortableSignal,
      }),
    )
    if (opt.logEvery) {
      this.transforms.push(transformLogProgress(opt))
    }
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
