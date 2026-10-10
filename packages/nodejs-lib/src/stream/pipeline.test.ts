import { Readable } from 'node:stream'
import { comparators } from '@naturalcycles/js-lib/array/sort.js'
import { pDelay } from '@naturalcycles/js-lib/promise'
import { END } from '@naturalcycles/js-lib/types'
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

test('limit after a transform completes gracefully on a small array source', async () => {
  // A source this small has already emitted `end` when the abort from `limit` lands,
  // which used to surface as "Premature close" instead of a graceful abort
  const r = await Pipeline.fromArray([1, 2, 3, 4])
    .mapSync(n => n * 10)
    .limit(2)
    .toArray()

  expect(r).toEqual([10, 20])
})

test('forEach returning END completes gracefully on a small array source', async () => {
  const seen: number[] = []

  await Pipeline.fromArray([1, 2, 3, 4]).forEach(
    async n => {
      seen.push(n)
      if (seen.length >= 2) return END
    },
    { concurrency: 1 },
  )

  expect(seen).toEqual([1, 2])
})

test('limit followed by an async forEach resolves only after the in-flight mappers are done', async () => {
  const seen: number[] = []

  await Pipeline.fromArray([1, 2, 3, 4])
    .mapSync(n => n)
    .limit(2)
    .forEach(async n => {
      await pDelay(10)
      seen.push(n)
    })

  expect(seen.toSorted(comparators.numericAsc)).toEqual([1, 2])
})

test('forEach returning END aborts the source', async () => {
  const seen: string[] = []

  await Pipeline.from<string>(new HonestReadable(100, 'p')).forEach(
    async item => {
      seen.push(item)
      if (seen.length >= 5) return END
    },
    { concurrency: 1 },
  )

  expect(seen.length).toBeGreaterThanOrEqual(5)
  expect(seen.length).toBeLessThan(100)
})

test('forEachSync returning END aborts the source', async () => {
  const seen: string[] = []

  await Pipeline.from<string>(new HonestReadable(100, 'p')).forEachSync(item => {
    seen.push(item)
    if (seen.length >= 5) return END
  })

  expect(seen.length).toBeGreaterThanOrEqual(5)
  expect(seen.length).toBeLessThan(100)
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
