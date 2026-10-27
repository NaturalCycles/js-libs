import { Readable } from 'node:stream'
import { expect, it } from 'vitest'
import { Pipeline } from '../pipeline.js'
import type { ReadableTyped } from '../stream.model.js'

it('should pass items to both the main stream and the fork', async () => {
  const secondArray: string[] = []

  const firstArray = await Pipeline.from(new HonestReadable(3))
    .mapSimple(n => {
      console.log(`n is ${n}`)
      return n * 2
    })
    .fork(p =>
      p
        .mapSimple(n2 => {
          console.log(`n2 is ${n2}`)
          const r = String(n2 * 2)
          secondArray.push(r)
          return r
        })
        .logProgress({
          metric: 'doorF',
          logEvery: 1,
        })
        .run(),
    )
    .logProgress({
      metric: 'door2',
      logEvery: 1,
    })
    .toArray()

  expect(firstArray).toEqual([2, 4, 6])
  expect(secondArray).toEqual(['4', '8', '12'])
})

/**
 * Readable that Honestly respects backpressure.
 */
class HonestReadable extends Readable implements ReadableTyped<number> {
  constructor(public size: number) {
    super({ objectMode: true, highWaterMark: 1 })
  }

  private count = 0
  private inProgress = false
  private done = false

  override _read(): void {
    if (this.done || this.inProgress) {
      return
    }
    this.inProgress = true
    this.process()
  }

  private process(): void {
    let shouldContinue = true

    while (shouldContinue) {
      this.count++

      shouldContinue = this.push(this.count)

      if (this.count >= this.size) {
        this.push(null)
        this.done = true
        break
      }
    }

    this.inProgress = false
  }
}
