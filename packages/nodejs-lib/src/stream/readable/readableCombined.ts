import { Readable } from 'node:stream'
import { type DeferredPromise, pDefer } from '@naturalcycles/js-lib/promise/pDefer.js'
import { pMap } from '@naturalcycles/js-lib/promise/pMap.js'
import type { ReadableTyped } from '@naturalcycles/nodejs-lib/stream'

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
  static create<T>(inputs: Readable[]): ReadableCombined<T> {
    return new ReadableCombined<T>(inputs)
  }

  private constructor(public inputs: Readable[]) {
    super({ objectMode: true })
    void this.start()
  }

  /**
   * If defined - we are in Paused mode
   * and should await the lock to be resolved before proceeding.
   *
   * If not defined - we are in Flowing mode, no limits in data flow.
   */
  private lock?: DeferredPromise

  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: ok
  private countIn = 0
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: ok
  private countOut = 0
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: ok
  private countReads = 0

  private async start(): Promise<void> {
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
          console.log(`ReadableCombined.push #${i} returned false, pausing the flow!`)
        }
      }

      console.log(`ReadableCombined: input #${i} done`)
    })

    console.log(`ReadableCombined: all inputs done!`)
    this.push(null)
  }

  override _read(): void {
    this.countReads++

    if (this.lock) {
      console.log(`ReadableCombined._read: resuming the flow!`)
      // calling it in this order is important!
      // this.lock should be undefined BEFORE we call lock.resolve()
      const { lock } = this
      this.lock = undefined
      lock.resolve()
    }
  }

  private logStats(): void {
    const { countIn, countOut, countReads } = this
    console.log({
      countIn,
      countOut,
      countReads,
    })
  }
}
