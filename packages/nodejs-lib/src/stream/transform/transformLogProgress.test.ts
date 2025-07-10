import { Readable } from 'node:stream'
import { pDelay } from '@naturalcycles/js-lib/promise'
import { expect, test } from 'vitest'
import type { ProgressLogItem } from '../index.js'
import { _pipeline, progressReadableMapper, readableFrom, writableVoid } from '../index.js'
import { transformLogProgress } from './transformLogProgress.js'

// todo: AsyncIterable2 (or Iterable2.mapAsync) should be implemented in js-lib
async function* rangeItAsync(
  fromIncl: number,
  toExcl: number,
  delay: number,
): AsyncIterable<number> {
  for (let i = fromIncl; i < toExcl; i++) {
    await pDelay(delay)
    yield i
  }
}

test('transformLogProgress', async () => {
  // const readable = readableFromArray(_range(0, 11), i => pDelay(10, i))
  // const readable = Readable.from(AsyncSequence.create(1, i => (i === 10 ? END : pDelay(10, i + 1))))
  const readable = Readable.from(rangeItAsync(1, 11, 10))
  let stats: ProgressLogItem

  await _pipeline([
    readable,
    transformLogProgress({
      logEvery: 2,
      peakRSS: true,
      logSizes: true,
      logZippedSizes: true,
      extra: (_r, index) => {
        // console.log(r, index)

        if (index % 10 === 0) return {}

        return {
          aaa: index,
        }
      },
      onProgressDone: s => (stats = s),
    }),
    // transformLogProgress({logProgressInterval: 10}),
    writableVoid(),
  ])

  expect(stats!).toEqual({
    progress_final: 10,
    peakRSS: expect.any(Number),
    rps10: expect.any(Number),
    rpsTotal: expect.any(Number),
    rss: expect.any(Number),
  })
})

test('progressReadableMapper', async () => {
  const readable = readableFrom(rangeItAsync(1, 11, 10))

  await readable
    .map(
      progressReadableMapper({
        logEvery: 2,
      }),
    )
    .toArray()
})
