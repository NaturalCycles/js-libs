import { Transform } from 'node:stream'
import { Worker } from 'node:worker_threads'
import { _range } from '@naturalcycles/js-lib/array/range.js'
import type { DeferredPromise } from '@naturalcycles/js-lib/promise'
import { pDefer } from '@naturalcycles/js-lib/promise/pDefer.js'
import type { AnyObject } from '@naturalcycles/js-lib/types'
import type { TransformTyped } from '../../stream.model.js'
import type { WorkerInput, WorkerOutput } from './transformMultiThreaded.model.js'

export interface TransformMultiThreadedOptions {
  /**
   * Absolute path to a js file with worker code
   */
  workerFile: string

  /**
   * @default 2, to match CircleCI and Github Actions environments
   */
  poolSize?: number

  /**
   * @default to poolSize
   */
  concurrency?: number

  /**
   * @default to Math.max(16, concurrency x 2)
   */
  highWaterMark?: number

  /**
   * Passed to the Worker as `workerData` property (initial data).
   */
  workerData?: AnyObject
}

const workerProxyFilePath = `${import.meta.dirname}/workerClassProxy.js`

/**
 * Spawns a pool of Workers (threads).
 * Distributes (using round-robin, equally) all inputs over Workers.
 * Workers emit 1 output for each 1 input.
 * Output of Workers is passed down the stream. Order is RANDOM (since it's a multi-threaded environment).
 */
export function transformMultiThreaded<IN, OUT>(
  opt: TransformMultiThreadedOptions,
): TransformTyped<IN, OUT> {
  const { workerFile, poolSize = 2, workerData } = opt
  const maxConcurrency = opt.concurrency || poolSize
  const highWaterMark = Math.max(16, maxConcurrency)

  console.log({
    poolSize,
    maxConcurrency,
    highWaterMark,
  })

  const workerDonePromises: DeferredPromise<Error | undefined>[] = []
  const messageDonePromises: Record<number, DeferredPromise<OUT>> = {}
  let index = -1 // input chunk index, will start from 0

  // Concurrency control
  let inFlight = 0
  let blockedCallback: (() => void) | null = null
  let flushBlocked: DeferredPromise | null = null

  const workers = _range(0, poolSize).map(workerIndex => {
    workerDonePromises.push(pDefer())

    const worker = new Worker(workerProxyFilePath, {
      workerData: {
        workerIndex,
        workerFile, // pass it, so workerProxy can require() it
        ...workerData,
      },
    })

    worker.on('error', err => {
      console.error(`Worker ${workerIndex} error`, err)
      workerDonePromises[workerIndex]!.reject(err as Error)
    })

    worker.on('exit', _exitCode => {
      workerDonePromises[workerIndex]!.resolve(undefined)
    })

    worker.on('message', (out: WorkerOutput<OUT>) => {
      if (out.error) {
        messageDonePromises[out.index]!.reject(out.error)
      } else {
        messageDonePromises[out.index]!.resolve(out.payload)
      }
    })

    return worker
  })

  return new Transform({
    objectMode: true,
    readableHighWaterMark: highWaterMark,
    writableHighWaterMark: highWaterMark,
    async transform(this: Transform, chunk: IN, _, cb) {
      const currentIndex = ++index
      inFlight++

      // Apply backpressure if at capacity, otherwise request more input
      if (inFlight < maxConcurrency) {
        cb()
      } else {
        blockedCallback = cb
      }

      // Create the unresolved promise (to await)
      messageDonePromises[currentIndex] = pDefer<OUT>()

      const worker = workers[currentIndex % poolSize]! // round-robin
      worker.postMessage({
        index: currentIndex,
        payload: chunk,
      } as WorkerInput)

      try {
        const out = await messageDonePromises[currentIndex]
        this.push(out)
      } catch (err) {
        // Currently we only support ErrorMode.SUPPRESS
        // Error is logged and output continues
        console.error(err)
      } finally {
        delete messageDonePromises[currentIndex]
        inFlight--

        // Release blocked callback if we now have capacity
        if (blockedCallback && inFlight < maxConcurrency) {
          const pendingCb = blockedCallback
          blockedCallback = null
          pendingCb()
        }

        // Trigger flush completion if all done
        if (inFlight === 0 && flushBlocked) {
          flushBlocked.resolve()
        }
      }
    },
    async flush(cb) {
      // Wait for all in-flight operations to complete
      if (inFlight > 0) {
        flushBlocked = pDefer()
        await flushBlocked
      }

      try {
        // Push null (complete) to all workers
        for (const worker of workers) {
          worker.postMessage(null)
        }

        console.log(`transformMultiThreaded.flush is waiting for all workers to be done`)
        await Promise.all(workerDonePromises)
        console.log(`transformMultiThreaded.flush all workers done`)

        cb()
      } catch (err) {
        cb(err as Error)
      }
    },
  })
}
