import { Readable } from 'node:stream'
import { pDelay } from '@naturalcycles/js-lib/promise'
import { expect, test } from 'vitest'
import { _pipeline } from '../pipeline/pipeline.js'
import { writablePushToArray } from '../writable/writablePushToArray.js'
import { transformLogProgress } from './transformLogProgress.js'
import { transformMapSimple } from './transformMapSimple.js'
import { transformTee } from './transformTee.js'

const delay = 100

async function* timedIterable(): AsyncGenerator<number> {
  yield await pDelay(delay, 1)
  yield await pDelay(delay, 2)
  yield await pDelay(delay, 3)
}

test('transformTee', async () => {
  const source = Readable.from(timedIterable())

  const firstArray: number[] = []
  const secondArray: number[] = []

  await _pipeline([
    source,
    transformMapSimple(n => {
      console.log(`n is ${n}`)
      return n * 2
    }),
    transformLogProgress({ logEvery: 1 }),
    transformTee([
      transformMapSimple(n2 => {
        console.log(`n2 is ${n2}`)
        return n2 * 2
      }),
      transformLogProgress({
        metric: 'second',
        logEvery: 1,
      }),
      writablePushToArray(secondArray),
    ]),
    writablePushToArray(firstArray),
  ])

  expect(firstArray).toEqual([2, 4, 6])
  expect(secondArray).toEqual([4, 8, 12])
})
