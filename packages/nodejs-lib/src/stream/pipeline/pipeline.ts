import type { Readable, Writable } from 'node:stream'
import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { _last } from '@naturalcycles/js-lib'
import type { DeferredPromise } from '@naturalcycles/js-lib/promise'
import { pDefer } from '@naturalcycles/js-lib/promise'
import type { AnyFunction } from '@naturalcycles/js-lib/types'
import { writablePushToArray } from '../writable/writablePushToArray.js'

type AnyStream = NodeJS.ReadableStream | NodeJS.WritableStream | NodeJS.ReadWriteStream

export interface PipelineOptions {
  /**
   * Set to true to allow ERR_STREAM_PREMATURE_CLOSE.
   * Required to support graceful close when using transformLimit
   */
  allowClose?: boolean

  /**
   * Set to true to allow graceful abort (via AbortSignal).
   * "Graceful" means it'll swallow the AbortError and let the pipeline resolve normally.
   *
   * Default is false - AbortError will be thrown.
   */
  allowGracefulAbort?: boolean

  signal?: AbortSignal
}

/**
 * Promisified `stream.pipeline`.
 *
 * Supports opt.allowClose, which allows transformLimit to work (to actually stop source Readable)
 * without throwing an error (ERR_STREAM_PREMATURE_CLOSE).
 */
export async function _pipeline(streams: AnyStream[], opt: PipelineOptions = {}): Promise<void> {
  const first = streams[0] as any
  const rest = streams.slice(1)

  if (opt.allowClose) {
    // Do the magic of making the pipeline "abortable"
    //
    // How does it work:
    // It finds `sourceReadable` (basically, it's just first item in the passed array of streams)
    // Finds last "writable" (last item), patches the `_final` method of it to detect when the whole pipeline is "done",
    // sets the `streamDone` DeferredPromise that resolves when the pipeline is done.
    // Scans through all passed items, finds those that are capable of "closing" the stream
    // (currently its `transformLimit` or `transformMap`)
    // Patches them by attaching `sourceReadable` and `streamDone`.
    // These items (transformLimit and transformMap), when they need to "close the stream" - call `pipelineClose`.
    // `pipelineClose` is the result of 2 sleepless nights of googling and experimentation:)
    // It does:
    // 1. Stops the "downstream" by doing `this.push(null)`.
    // 2. Pauses the `sourceReadable` by calling sourceReadable.unpipe()
    // 3. Waits for `streamDone` to ensure that downstream chunks are fully processed (e.g written to disk).
    // 4. Calls `sourceReadable.destroy()`, which emits ERR_STREAM_PREMATURE_CLOSE
    // 5. _pipeline (this function) catches that specific error and suppresses it (because it's expected and
    // inevitable in this flow). Know a better way to close the stream? Tell me!
    const streamDone = pDefer()
    const sourceReadable = first as Readable
    const last = _last(streams) as Writable
    const lastFinal = last._final?.bind(last) || ((cb: AnyFunction) => cb())
    last._final = cb => {
      lastFinal(() => {
        cb()
        streamDone.resolve()
      })
    }

    rest.forEach(s => {
      // console.log(s)
      if (s instanceof AbortableTransform || s.constructor.name === 'AbortableTransform') {
        // console.log(`found ${s.constructor.name}, setting props`)
        ;(s as AbortableTransform).sourceReadable = sourceReadable
        ;(s as AbortableTransform).streamDone = streamDone
      }
    })
  }

  try {
    return await pipeline([first, ...rest], opt)
  } catch (err) {
    if (opt.allowClose && (err as any)?.code === 'ERR_STREAM_PREMATURE_CLOSE') {
      console.log('_pipeline closed (as expected)')
      return
    }

    if (opt.allowGracefulAbort && (err as any)?.name === 'AbortError') {
      console.log('_pipeline closed via AbortSignal (as expected)')
      return
    }

    // console.log(`_pipeline error`, err)
    throw err
  }
}

/**
 * Convenience function to make _pipeline collect all items at the end of the stream (should be Transform, not Writeable!)
 * and return.
 */
export async function _pipelineToArray<T>(
  streams: AnyStream[],
  opt: PipelineOptions = {},
): Promise<T[]> {
  const a: T[] = []
  await _pipeline([...streams, writablePushToArray(a)], opt)
  return a
}

export class AbortableTransform extends Transform {
  sourceReadable?: Readable
  streamDone?: DeferredPromise
}
