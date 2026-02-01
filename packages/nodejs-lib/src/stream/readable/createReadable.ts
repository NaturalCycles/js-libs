import { Readable, Transform } from 'node:stream'
import type { ReadableOptions } from 'node:stream'
import type { ReadableTyped } from '../stream.model.js'

/**
 * Convenience function to create a Readable that can be pushed into (similar to RxJS Subject).
 * Push `null` to it to complete (similar to RxJS `.complete()`).
 *
 * Difference from Readable.from() is that this readable is not "finished" yet and allows pushing more to it.
 *
 * Caution!
 * The implementation of this Readable is not fully compliant,
 * e.g the read() method doesn't return anything, so, it will hang the Node process (or cause it to process.exit(0))
 * if read() will be called AFTER everything was pushed and Readable is closed (by pushing `null`).
 * Beware of it when e.g doing unit testing! Jest prefers to hang (not exit-0).
 */
export function createReadable<T>(
  items: Iterable<T> = [],
  opt?: ReadableOptions,
  onRead?: () => void, // read callback
): ReadableTyped<T> {
  const readable = new Readable({
    objectMode: true,
    ...opt,
    read() {
      onRead?.()
    },
  })
  for (const item of items) {
    readable.push(item)
  }
  return readable
}

/**
 * Convenience type-safe wrapper around Readable.from() that infers the Type of input.
 */
export function createReadableFrom<T>(
  iterable: Iterable<T> | AsyncIterable<T>,
  opt?: ReadableOptions,
): ReadableTyped<T> {
  return Readable.from(iterable, opt)
}

/**
 * Allows to "create Readable asynchronously".
 * Implemented via a proxy Transform, which is created (and returned) eagerly,
 * and later (when source Readable is created) serves as a pass-through proxy.
 */
export function createReadableFromAsync<T>(fn: () => Promise<ReadableTyped<T>>): ReadableTyped<T> {
  const transform = new Transform({
    objectMode: true,
    highWaterMark: 1,
    transform: (chunk, _encoding, cb) => {
      cb(null, chunk)
    },
  })

  void fn()
    .then(readable => {
      readable.on('error', err => transform.destroy(err)).pipe(transform)
    })
    .catch(err => transform.destroy(err))

  return transform
}
