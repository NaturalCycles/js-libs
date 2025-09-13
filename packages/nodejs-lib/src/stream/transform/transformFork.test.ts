import { Readable } from 'node:stream'
import { pDelay } from '@naturalcycles/js-lib/promise/pDelay.js'
import { expect, test } from 'vitest'
import { Pipeline } from '../pipeline.js'
import type { ReadableTyped } from '../stream.model.js'

test('transformFork', async () => {
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

// unskip to test manually
test.skip('source stream gets stuck', async () => {
  await Pipeline.from(new HonestReadable(200, 500, 30))
    .mapSimple(n => n * 2)
    .fork(p => {
      return p
        .mapSimple(n2 => n2 * 2)
        .logProgress({
          metric: 'doorF',
          logEvery: 1,
        })
        .run()
    })
    .logProgress({
      metric: 'door2',
      logEvery: 1,
    })
    .run()
}, 120_000)

// unskip to test manually
test.skip('main stream consumer gets stuck', async () => {
  await Pipeline.from(new HonestReadable(200, 100))
    .mapSimple(n => n * 2, { highWaterMark: 1 })
    .fork(
      p => {
        return p
          .mapSimple(n2 => n2 * 2, { highWaterMark: 1 })
          .logProgress({
            metric: 'fork',
            logEvery: 1,
          })
          .run()
      },
      { highWaterMark: 1 },
    )
    .map(
      async (n, i) => {
        if (i === 30) {
          console.log('consumer got stuck')
          await pDelay(20_000)
          console.log('consumer got unstuck')
        }

        return n
      },
      {
        concurrency: 1,
        highWaterMark: 1,
      },
    )
    .logProgress({
      metric: 'main',
      logEvery: 1,
    })
    .run()
}, 120_000)

// unskip to test manually
test.skip('fork stream consumer gets stuck', async () => {
  await Pipeline.from(new HonestReadable(200, 100))
    .mapSimple(n => n * 2, { highWaterMark: 1 })
    .fork(
      p => {
        return p
          .map(
            async (n2, i) => {
              if (i === 30) {
                console.log('consumer got stuck')
                await pDelay(20_000)
                console.log('consumer got unstuck')
              }
              return n2 * 2
            },
            { concurrency: 1, highWaterMark: 1 },
          )
          .logProgress({
            metric: 'fork',
            logEvery: 1,
          })
          .run()
      },
      { highWaterMark: 1 },
    )
    .map(async n => n * 2, {
      concurrency: 1,
      highWaterMark: 1,
    })
    .logProgress({
      metric: 'main',
      logEvery: 1,
    })
    .run()
}, 120_000)

/**
 * Readable that Honestly respects backpressure.
 */
class HonestReadable extends Readable implements ReadableTyped<number> {
  constructor(
    public size: number,
    public delay?: number,
    public stuckAfterIndex?: number,
  ) {
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
    void this.process()
  }

  private async process(): Promise<void> {
    let shouldContinue = true

    while (shouldContinue) {
      this.count++

      if (this.delay) {
        await pDelay(this.delay)
      }
      if (this.count === this.stuckAfterIndex) {
        await pDelay(10_000)
      }

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
