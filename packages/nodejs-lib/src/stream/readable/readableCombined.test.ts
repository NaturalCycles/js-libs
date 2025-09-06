import { Readable } from 'node:stream'
import { pDelay } from '@naturalcycles/js-lib/promise/pDelay.js'
import { test, vi } from 'vitest'
import { _pipeline, transformLogProgress, transformMap, writableVoid } from '../index.js'
import { ReadableCombined } from './readableCombined.js'

vi.setConfig({
  testTimeout: 600_000,
})

// const delay = 100
//
// async function* timedIterable(sourceNum: number): AsyncGenerator<string> {
//   for (const _ of _range(100)) {
//     yield await pDelay(delay, `${sourceNum}_1`)
//     yield await pDelay(delay, `${sourceNum}_2`)
//     yield await pDelay(delay, `${sourceNum}_3`)
//     yield await pDelay(delay, `${sourceNum}_4`)
//     yield await pDelay(delay, `${sourceNum}_5`)
//     yield await pDelay(delay, `${sourceNum}_6`)
//   }
// }

/**
 * Readable that Honestly respects backpressure.
 */
class HonestReadable extends Readable {
  constructor(
    public size: number,
    public num: number,
  ) {
    super({ objectMode: true })
  }

  private count = 0
  private done = false

  override _read(): void {
    if (this.done) {
      return
    }
    let shouldContinue = true

    while (shouldContinue) {
      this.count++
      shouldContinue = this.push(`${this.num}_${this.count}`)

      if (this.count >= this.size) {
        this.push(null)
        this.done = true
        break
      }
    }
  }
}

test.skip('readableCombined', async () => {
  // const source1 = Readable.from(timedIterable(1))
  // const source2 = Readable.from(timedIterable(2))
  // const source3 = Readable.from(timedIterable(3))
  const source1 = new HonestReadable(30, 1)
  const source2 = new HonestReadable(30, 2)
  const source3 = new HonestReadable(30, 3)

  // await ReadableCombined.create([
  //   source1,
  //   source2,
  //   source3,
  // ]).forEach(item => {
  //   console.log(item)
  // })

  await _pipeline([
    ReadableCombined.create([source1, source2, source3]),
    transformLogProgress({
      metric: 'door1',
      logEvery: 1,
    }),
    transformMap(
      async item => {
        // console.log('map incoming', item)
        await pDelay(1000)
        return item
      },
      {
        concurrency: 1,
      },
    ),
    transformLogProgress({
      metric: 'door2',
      logEvery: 1,
    }),
    writableVoid(),
  ])

  console.log('done')
})
