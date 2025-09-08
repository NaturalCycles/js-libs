import { Readable } from 'node:stream'
import { expect, test } from 'vitest'
import { Pipeline } from './pipeline.js'
import type { ReadableTyped } from './stream.model.js'

test('Pipeline', async () => {
  const r = await Pipeline.from<string>(new HonestReadable(150, 'p'))
    .chunk(2)
    .flatten()
    .logProgress({ logEvery: 1, metric: 'door1' })
    .limit(3)
    .logProgress({ logEvery: 1, metric: 'door2' })
    .toArray()

  // console.log(r)
  expect(r).toEqual(['p_1', 'p_2', 'p_3'])
})

/**
 * Readable that Honestly respects backpressure.
 */
class HonestReadable extends Readable implements ReadableTyped<string> {
  constructor(
    public size: number,
    public prefix: string,
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
      shouldContinue = this.push(`${this.prefix}_${this.count}`)

      if (this.count >= this.size) {
        this.push(null)
        this.done = true
        break
      }
    }
  }
}
