import { _range } from '@naturalcycles/js-lib/array/range.js'
import { ErrorMode, pExpectedError } from '@naturalcycles/js-lib/error'
import { pDelay } from '@naturalcycles/js-lib/promise/pDelay.js'
import type { AsyncIndexedMapper } from '@naturalcycles/js-lib/types'
import { expect, test } from 'vitest'
import { Pipeline } from '../pipeline.js'
import type { TransformMapStats } from './transformMap.js'
import { transformMap2 } from './transformMap2.js'

interface Item {
  id: string
}

const mapperError3: AsyncIndexedMapper<Item, Item> = async item => {
  if (item.id === '3') throw new Error('my error')
  return item
}

test('transformMap2 simple', async () => {
  const data: Item[] = _range(1, 4).map(n => ({ id: String(n) }))
  const data2: Item[] = []

  await Pipeline.fromArray(data)
    .transform(transformMap2(async r => void data2.push(r)))
    .run()

  expect(data2).toEqual(data)
})

test('transformMap2 with mapping', async () => {
  const data: Item[] = _range(1, 4).map(n => ({ id: String(n) }))
  const data2 = await Pipeline.fromArray(data)
    .transform(
      transformMap2(async r => ({
        id: r.id + '!',
      })),
    )
    .toArray()

  expect(data2).toEqual(data.map(r => ({ id: r.id + '!' })))
})

test('transformMap2 errorMode=THROW_IMMEDIATELY', async () => {
  let stats: TransformMapStats
  const data: Item[] = _range(1, 5).map(n => ({ id: String(n) }))
  const data2: Item[] = []

  await expect(
    Pipeline.fromArray(data)
      .transform(transformMap2(mapperError3, { concurrency: 1, onDone: s => (stats = s) }))
      .transform(transformMap2(async r => void data2.push(r)))
      .run(),
  ).rejects.toThrow('my error')

  expect(data2).toEqual(data.filter(r => Number(r.id) < 3))

  expect(stats!.ok).toBe(false)
  expect(stats!.countErrors).toBe(1)
})

test('transformMap2 errorMode=THROW_AGGREGATED', async () => {
  let stats: TransformMapStats
  const data: Item[] = _range(1, 5).map(n => ({ id: String(n) }))
  const data2: Item[] = []

  const err = await pExpectedError(
    Pipeline.fromArray(data)
      .transform(
        transformMap2(mapperError3, {
          errorMode: ErrorMode.THROW_AGGREGATED,
          onDone: s => (stats = s),
        }),
      )
      .transform(transformMap2(async r => void data2.push(r)))
      .run(),
    AggregateError,
  )
  expect(err.message).toContain('1 error(s)')

  expect(data2).toEqual(data.filter(r => r.id !== '3'))

  expect(stats!.ok).toBe(false)
  expect(stats!.countErrors).toBe(1)
  expect(stats!.collectedErrors).toHaveLength(1)
})

test('transformMap2 errorMode=SUPPRESS', async () => {
  let stats: TransformMapStats
  const data: Item[] = _range(1, 5).map(n => ({ id: String(n) }))
  const data2: Item[] = []

  await Pipeline.fromArray(data)
    .transform(
      transformMap2(mapperError3, { errorMode: ErrorMode.SUPPRESS, onDone: s => (stats = s) }),
    )
    .transform(transformMap2(async r => void data2.push(r)))
    .run()

  expect(data2).toEqual(data.filter(r => r.id !== '3'))

  expect(stats!.ok).toBe(true)
  expect(stats!.countErrors).toBe(1)
})

test('transformMap2 with warmup passes all items', async () => {
  const data = _range(1, 21).map(id => ({ id }))

  const results = await Pipeline.fromArray(data)
    .transform(
      transformMap2(
        async item => {
          await pDelay(5)
          return item
        },
        { concurrency: 8, warmupSeconds: 0.1 },
      ),
    )
    .toArray()

  // With concurrency, order is not guaranteed, so compare as sets
  expect(results.sort((a, b) => a.id - b.id)).toEqual(data)
})

test('transformMap2 warmup limits initial concurrency', async () => {
  const concurrencyLog: number[] = []
  let currentConcurrency = 0

  const data = _range(1, 31).map(id => ({ id }))

  await Pipeline.fromArray(data)
    .transform(
      transformMap2(
        async item => {
          currentConcurrency++
          concurrencyLog.push(currentConcurrency)
          await pDelay(15)
          currentConcurrency--
          return item
        },
        { concurrency: 8, warmupSeconds: 0.15 },
      ),
    )
    .run()

  // First items should have lower concurrency
  expect(concurrencyLog[0]).toBeLessThanOrEqual(2)

  // Later items should reach higher concurrency
  const maxConcurrency = Math.max(...concurrencyLog)
  expect(maxConcurrency).toBeGreaterThan(1)
})

test('transformMap2 without warmup reaches full concurrency immediately', async () => {
  const concurrencyLog: number[] = []
  let currentConcurrency = 0

  const data = _range(1, 21).map(id => ({ id }))

  await Pipeline.fromArray(data)
    .transform(
      transformMap2(
        async item => {
          currentConcurrency++
          concurrencyLog.push(currentConcurrency)
          await pDelay(20)
          currentConcurrency--
          return item
        },
        { concurrency: 8, warmupSeconds: 0 },
      ),
    )
    .run()

  // Should reach high concurrency quickly
  const maxConcurrency = Math.max(...concurrencyLog)
  expect(maxConcurrency).toBeGreaterThanOrEqual(4)
})

test('transformMap2 onDone is called with stats', async () => {
  let stats: TransformMapStats

  const data = _range(1, 6).map(id => ({ id }))

  await Pipeline.fromArray(data)
    .transform(
      transformMap2(async item => item, {
        onDone: s => (stats = s),
      }),
    )
    .run()

  expect(stats!.ok).toBe(true)
  expect(stats!.countIn).toBe(5)
  expect(stats!.countOut).toBe(5)
  expect(stats!.countErrors).toBe(0)
})
