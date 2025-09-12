import type { Readable, Transform, Writable } from 'node:stream'
import type { CommonLogger, CommonLogLevel } from '@naturalcycles/js-lib/log'
import type { Promisable } from '@naturalcycles/js-lib/types'

export interface ReadableSignalOptions {
  /** allows destroying the stream if the signal is aborted. */
  signal?: AbortSignal
}

export interface ReadableArrayOptions {
  /** the maximum concurrent invocations of `fn` to call on the stream at once. **Default: 1**. */
  concurrency?: number
  /** allows destroying the stream if the signal is aborted. */
  signal?: AbortSignal
}

export type ReadableMapper<IN, OUT> = (data: IN, opt?: ReadableSignalOptions) => Promisable<OUT>

export type ReadableFlatMapper<IN, OUT> = (
  data: IN,
  opt?: ReadableSignalOptions,
) => Promisable<OUT[]>

export type ReadableVoidMapper<IN> = (data: IN, opt?: ReadableSignalOptions) => void | Promise<void>

export type ReadablePredicate<IN> = (
  data: IN,
  opt?: ReadableSignalOptions,
) => boolean | Promise<boolean>

export interface ReadableTyped<T> extends Readable {
  toArray: (opt?: ReadableSignalOptions) => Promise<T[]>

  map: <OUT>(mapper: ReadableMapper<T, OUT>, opt?: ReadableArrayOptions) => ReadableTyped<OUT>

  flatMap: <OUT>(
    mapper: ReadableFlatMapper<T, OUT>,
    opt?: ReadableArrayOptions,
  ) => ReadableTyped<OUT>

  filter: (predicate: ReadablePredicate<T>, opt?: ReadableArrayOptions) => ReadableTyped<T>

  forEach: (mapper: ReadableVoidMapper<T>, opt?: ReadableArrayOptions) => Promise<void>

  take: (limit: number, opt?: ReadableSignalOptions) => ReadableTyped<T>
  drop: (limit: number, opt?: ReadableSignalOptions) => ReadableTyped<T>
}

// biome-ignore lint/correctness/noUnusedVariables: ok
export interface WritableTyped<T> extends Writable {}

/**
 * Type alias that indicates that the Readable is not in objectMode,
 * e.g returns a binary stream (like a gzip stream).
 */
export type ReadableBinary = Readable
/**
 * Type alias that indicates that the Writable is not in objectMode,
 * e.g reads a binary stream (like a gzip stream).
 */
export type WritableBinary = Writable

// biome-ignore lint/correctness/noUnusedVariables: ok
export interface TransformTyped<IN, OUT> extends Transform {}

export interface TransformOptions {
  /**
   * @default true
   */
  objectMode?: boolean

  /**
   * @default 16
   */
  highWaterMark?: number

  /**
   * Defaults to `console`.
   */
  logger?: CommonLogger

  /**
   * Not every Transform implements it.
   * Can be one of:
   * debug - most verbose, when debugging is needed
   * log - default level
   * error - logs errors and warnings only
   *
   * Default is 'log'.
   *
   */
  logLevel?: CommonLogLevel
}
