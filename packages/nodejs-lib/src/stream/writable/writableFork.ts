import { Writable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { readableCreate } from '../readable/readableCreate.js'
import type { ReadableTyped, TransformOptions, WritableTyped } from '../stream.model.js'

/**
 * Allows "forking" a stream inside pipeline into a number of pipeline chains (2 or more).
 * Currently does NOT (!) maintain backpressure.
 * Error in the forked pipeline will propagate up to the main pipeline (and log error, to be sure).
 * Will wait until all forked pipelines are completed before completing the stream.
 *
 * @experimental
 */
export function writableFork<T>(
  chains: NodeJS.WritableStream[][],
  opt?: TransformOptions,
): WritableTyped<T> {
  const readables: ReadableTyped<T>[] = []

  const allChainsDone = Promise.all(
    chains.map(async chain => {
      const readable = readableCreate<T>()
      readables.push(readable)

      return await pipeline([readable, ...chain])
    }),
  ).catch(err => {
    console.error(err) // ensure the error is logged
    throw err
  })

  return new Writable({
    objectMode: true,
    ...opt,
    write(chunk: T, _, cb) {
      // Push/fork to all sub-streams
      // No backpressure is ensured here, it'll push regardless of the
      readables.forEach(readable => readable.push(chunk))

      cb()
    },
    async final(cb) {
      try {
        // Push null (complete) to all sub-streams
        readables.forEach(readable => readable.push(null))

        console.log(`writableFork.final is waiting for all chains to be done`)
        await allChainsDone
        console.log(`writableFork.final all chains done`)
        cb()
      } catch (err) {
        cb(err as Error)
      }
    },
  })
}
