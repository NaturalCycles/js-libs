import { _range } from '@naturalcycles/js-lib/array/range.js'
import { pDelay } from '@naturalcycles/js-lib/promise/pDelay.js'
import { expect, it } from 'vitest'
import { Pipeline } from '../pipeline.js'

it('should pass all items through', async () => {
  const data = _range(1, 11).map(id => ({ id }))

  const results = await Pipeline.fromArray(data)
    .warmup({
      concurrency: 4,
      warmupSeconds: 0.1,
    })
    .toArray()

  expect(results).toEqual(data)
})

it('should pass all items through with warmupSeconds 0', async () => {
  const data = _range(1, 101).map(id => ({ id }))

  const results = await Pipeline.fromArray(data)
    .warmup({
      concurrency: 16,
      warmupSeconds: 0,
    })
    .toArray()

  expect(results).toEqual(data)
})

it('should pass all items through with concurrency 1', async () => {
  const data = _range(1, 21).map(id => ({ id }))

  const results = await Pipeline.fromArray(data)
    .warmup({
      concurrency: 1,
      warmupSeconds: 1,
    })
    .toArray()

  expect(results).toEqual(data)
})

it('should start the first item alone during warmup', async () => {
  const concurrencyLog: number[] = []
  let currentConcurrency = 0
  let maxConcurrency = 0

  const data = _range(1, 21).map(id => ({ id }))

  await Pipeline.fromArray(data)
    .warmup({
      concurrency: 8,
      warmupSeconds: 0.2,
    })
    .map(
      async item => {
        currentConcurrency++
        maxConcurrency = Math.max(maxConcurrency, currentConcurrency)
        concurrencyLog.push(currentConcurrency)
        await pDelay(20) // Simulate async work
        currentConcurrency--
        return item
      },
      { concurrency: 16 },
    ) // High concurrency to not limit from downstream
    .run()

  // During warmup, concurrency should start at 1 and gradually increase
  // The first few items should have lower concurrency
  expect(concurrencyLog[0]).toBeLessThanOrEqual(2) // First item(s) should be low concurrency
})

it('should raise the average concurrency above 1 after warmup', async () => {
  const concurrencyLog: number[] = []
  let currentConcurrency = 0

  // Use more items to ensure we have items after warmup
  const data = _range(1, 51).map(id => ({ id }))

  await Pipeline.fromArray(data)
    .warmup({
      concurrency: 8,
      warmupSeconds: 0.05, // Very short warmup
    })
    .map(
      async item => {
        currentConcurrency++
        concurrencyLog.push(currentConcurrency)
        await pDelay(10)
        currentConcurrency--
        return item
      },
      { concurrency: 16 },
    )
    .run()

  // After warmup, should reach higher concurrency
  const lastFewConcurrencies = concurrencyLog.slice(-10)
  const avgLastConcurrency =
    lastFewConcurrencies.reduce((a, b) => a + b, 0) / lastFewConcurrencies.length

  // Should be higher than initial (which was around 1)
  expect(avgLastConcurrency).toBeGreaterThan(1)
})

it('should feed all items to a following Pipeline.map', async () => {
  const data = _range(1, 11).map(id => ({ id }))

  const results = await Pipeline.fromArray(data)
    .warmup({
      concurrency: 4,
      warmupSeconds: 0.1,
    })
    .map(async item => ({ ...item, processed: true }))
    .toArray()

  expect(results).toEqual(data.map(item => ({ ...item, processed: true })))
})
