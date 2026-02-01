import { Readable } from 'node:stream'
import { createCommonLoggerAtLevel } from '@naturalcycles/js-lib/log'
import type { CommonLogger } from '@naturalcycles/js-lib/log'
import { pDefer } from '@naturalcycles/js-lib/promise/pDefer.js'
import type { DeferredPromise } from '@naturalcycles/js-lib/promise/pDefer.js'
import { pMap } from '@naturalcycles/js-lib/promise/pMap.js'
import type { ReadableTyped } from '@naturalcycles/nodejs-lib/stream'
import type { TransformOptions } from '../stream.model.js'

/**
 * Allows to combine multiple Readables into 1 Readable.
 * As soon as any of the input Readables emit - the output Readable emits
 * (passes through).
 * Order is not preserved in any way, first come first served!
 *
 * Readable completes when all input Readables complete.
 *
 * @experimental
 */
export class ReadableCombined<T> extends Readable implements ReadableTyped<T> {
  static create<T>(inputs: Readable[], opt: TransformOptions = {}): ReadableCombined<T> {
    return new ReadableCombined<T>(inputs, opt)
  }

  private constructor(
    public inputs: Readable[],
    opt: TransformOptions,
  ) {
    const { objectMode = true, highWaterMark } = opt
    super({ objectMode, highWaterMark })
    this.logger = createCommonLoggerAtLevel(opt.logger, opt.logLevel)
    void this.run()
  }

  private logger: CommonLogger

  /**
   * If defined - we are in Paused mode
   * and should await the lock to be resolved before proceeding.
   *
   * If not defined - we are in Flowing mode, no limits in data flow.
   */
  private lock?: DeferredPromise

  private countIn = 0

  private countOut = 0

  private countReads = 0

  private async run(): Promise<void> {
    const { logger } = this

    await pMap(this.inputs, async (input, i) => {
      for await (const item of input) {
        this.countIn++
        this.logStats()
        if (this.lock) {
          await this.lock
          // lock is undefined at this point
        }

        const shouldContinue = this.push(item)
        this.countOut++
        if (!shouldContinue && !this.lock) {
          this.lock = pDefer()
          logger.log(`ReadableCombined.push #${i} returned false, pausing the flow!`)
        }
      }

      logger.log(`ReadableCombined: input #${i} done`)
    })

    logger.log(`ReadableCombined: all inputs done!`)
    this.push(null)
  }

  override _read(): void {
    this.countReads++

    if (this.lock) {
      this.logger.log(`ReadableCombined._read: resuming the flow!`)
      // calling it in this order is important!
      // this.lock should be undefined BEFORE we call lock.resolve()
      const { lock } = this
      this.lock = undefined
      lock.resolve()
    }
  }

  private logStats(): void {
    const { countIn, countOut, countReads } = this
    this.logger.debug({
      countIn,
      countOut,
      countReads,
    })
  }
}
