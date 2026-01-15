import { _range } from '@naturalcycles/js-lib/array/range.js'
import { ErrorMode, pExpectedError } from '@naturalcycles/js-lib/error'
import { pDelay } from '@naturalcycles/js-lib/promise/pDelay.js'
import type { AsyncIndexedMapper } from '@naturalcycles/js-lib/types'
import { SKIP } from '@naturalcycles/js-lib/types'
import { expect, test } from 'vitest'
import { Pipeline } from '../pipeline.js'
import type { TransformMapStats } from './transformMap.js'
import { transformMap } from './transformMap.js'

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
    .transform(transformMap(async r => void data2.push(r)))
    .run()

  expect(data2).toEqual(data)
})

test('transformMap2 with mapping', async () => {
  const data: Item[] = _range(1, 4).map(n => ({ id: String(n) }))
  const data2 = await Pipeline.fromArray(data)
    .transform(
      transformMap(async r => ({
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
      .transform(transformMap(mapperError3, { concurrency: 1, onDone: s => (stats = s) }))
      .transform(transformMap(async r => void data2.push(r)))
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
        transformMap(mapperError3, {
          errorMode: ErrorMode.THROW_AGGREGATED,
          onDone: s => (stats = s),
        }),
      )
      .transform(transformMap(async r => void data2.push(r)))
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
      transformMap(mapperError3, { errorMode: ErrorMode.SUPPRESS, onDone: s => (stats = s) }),
    )
    .transform(transformMap(async r => void data2.push(r)))
    .run()

  expect(data2).toEqual(data.filter(r => r.id !== '3'))

  expect(stats!.ok).toBe(true)
  expect(stats!.countErrors).toBe(1)
})

test('transformMap2 with warmup passes all items', async () => {
  const data = _range(1, 21).map(id => ({ id }))

  const results = await Pipeline.fromArray(data)
    .transform(
      transformMap(
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

  const data = _range(1, 51).map(id => ({ id }))

  await Pipeline.fromArray(data)
    .transform(
      transformMap(
        async item => {
          currentConcurrency++
          concurrencyLog.push(currentConcurrency)
          await pDelay(50) // longer delay to span warmup period
          currentConcurrency--
          return item
        },
        { concurrency: 8, warmupSeconds: 2 }, // longer warmup to exceed check interval
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
      transformMap(
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
      transformMap(async item => item, {
        onDone: s => (stats = s),
      }),
    )
    .run()

  expect(stats!.ok).toBe(true)
  expect(stats!.countIn).toBe(5)
  expect(stats!.countOut).toBe(5)
  expect(stats!.countErrors).toBe(0)
})

// Backpressure and concurrency control tests

test('backpressure: concurrency is never exceeded', async () => {
  let currentConcurrency = 0
  let maxObservedConcurrency = 0
  const targetConcurrency = 4

  const data = _range(1, 101)

  await Pipeline.fromArray(data)
    .transform(
      transformMap(
        async n => {
          currentConcurrency++
          maxObservedConcurrency = Math.max(maxObservedConcurrency, currentConcurrency)
          // Verify we never exceed the limit
          expect(currentConcurrency).toBeLessThanOrEqual(targetConcurrency)
          await pDelay(Math.random() * 10)
          currentConcurrency--
          return n
        },
        { concurrency: targetConcurrency },
      ),
    )
    .run()

  expect(maxObservedConcurrency).toBe(targetConcurrency)
})

test('backpressure: concurrency=1 processes sequentially', async () => {
  const processingOrder: number[] = []
  const completionOrder: number[] = []

  const data = _range(1, 11)

  await Pipeline.fromArray(data)
    .transform(
      transformMap(
        async n => {
          processingOrder.push(n)
          await pDelay(5)
          completionOrder.push(n)
          return n
        },
        { concurrency: 1 },
      ),
    )
    .run()

  // With concurrency=1, both orders should match input order
  expect(processingOrder).toEqual(data)
  expect(completionOrder).toEqual(data)
})

test('backpressure: blocked items are released when slots free up', async () => {
  const events: string[] = []
  const concurrency = 2

  const data = _range(1, 6) // 5 items

  await Pipeline.fromArray(data)
    .transform(
      transformMap(
        async n => {
          events.push(`start:${n}`)
          // Varying delays to create interesting completion patterns
          await pDelay(n === 1 ? 50 : 10)
          events.push(`end:${n}`)
          return n
        },
        { concurrency },
      ),
    )
    .run()

  // Items 1 and 2 should start first (concurrency=2)
  expect(events[0]).toBe('start:1')
  expect(events[1]).toBe('start:2')

  // All items should complete
  expect(events.filter(e => e.startsWith('end:'))).toHaveLength(5)
})

test('backpressure: handles fast producer with slow consumer', async () => {
  let inFlight = 0
  let maxInFlight = 0
  const concurrency = 3

  // 50 items, each takes 20ms to process
  const data = _range(1, 51)

  const results = await Pipeline.fromArray(data)
    .transform(
      transformMap(
        async n => {
          inFlight++
          maxInFlight = Math.max(maxInFlight, inFlight)
          await pDelay(20)
          inFlight--
          return n * 2
        },
        { concurrency },
      ),
    )
    .toArray()

  expect(results).toHaveLength(50)
  expect(maxInFlight).toBeLessThanOrEqual(concurrency)
  // Verify all items were processed correctly
  expect(results.sort((a, b) => a - b)).toEqual(data.map(n => n * 2))
})

// Edge cases

test('edge case: empty stream', async () => {
  let stats: TransformMapStats | undefined

  const results = await Pipeline.fromArray([])
    .transform(
      transformMap(async n => n, {
        onDone: s => (stats = s),
      }),
    )
    .toArray()

  expect(results).toEqual([])
  expect(stats!.countIn).toBe(0)
  expect(stats!.countOut).toBe(0)
})

test('edge case: single item', async () => {
  const results = await Pipeline.fromArray([42])
    .transform(transformMap(async n => n * 2, { concurrency: 4 }))
    .toArray()

  expect(results).toEqual([84])
})

test('edge case: concurrency higher than item count', async () => {
  let maxConcurrency = 0
  let current = 0

  const data = _range(1, 4) // 3 items

  await Pipeline.fromArray(data)
    .transform(
      transformMap(
        async n => {
          current++
          maxConcurrency = Math.max(maxConcurrency, current)
          await pDelay(20)
          current--
          return n
        },
        { concurrency: 10 }, // concurrency > item count
      ),
    )
    .run()

  // All 3 items should process concurrently
  expect(maxConcurrency).toBe(3)
})

test('edge case: SKIP filters items correctly', async () => {
  const data = _range(1, 11)

  const results = await Pipeline.fromArray(data)
    .transform(
      transformMap(
        async n => {
          if (n % 2 === 0) return SKIP
          return n
        },
        { concurrency: 4 },
      ),
    )
    .toArray()

  expect(results.sort((a, b) => a - b)).toEqual([1, 3, 5, 7, 9])
})

test('edge case: predicate filters output', async () => {
  const data = _range(1, 11)

  const results = await Pipeline.fromArray(data)
    .transform(
      transformMap(async n => n * 2, {
        concurrency: 4,
        predicate: n => n > 10, // only keep results > 10
      }),
    )
    .toArray()

  expect(results.sort((a, b) => a - b)).toEqual([12, 14, 16, 18, 20])
})

test('edge case: asyncPredicate filters output', async () => {
  const data = _range(1, 11)

  const results = await Pipeline.fromArray(data)
    .transform(
      transformMap(async n => n, {
        concurrency: 4,
        asyncPredicate: async n => {
          await pDelay(1)
          return n % 3 === 0 // only keep multiples of 3
        },
      }),
    )
    .toArray()

  expect(results.sort((a, b) => a - b)).toEqual([3, 6, 9])
})

// Race condition and timing tests

test('race condition: multiple items completing simultaneously', async () => {
  let inFlight = 0
  const concurrency = 5
  const data = _range(1, 21)

  const results = await Pipeline.fromArray(data)
    .transform(
      transformMap(
        async n => {
          inFlight++
          expect(inFlight).toBeLessThanOrEqual(concurrency)
          // All items take same time - will complete close together
          await pDelay(10)
          inFlight--
          return n
        },
        { concurrency },
      ),
    )
    .toArray()

  expect(results).toHaveLength(20)
})

test('race condition: interleaved fast and slow operations', async () => {
  const completionOrder: number[] = []
  const data = _range(1, 11)

  await Pipeline.fromArray(data)
    .transform(
      transformMap(
        async n => {
          // Odd numbers are slow, even numbers are fast
          await pDelay(n % 2 === 1 ? 30 : 5)
          completionOrder.push(n)
          return n
        },
        { concurrency: 4 },
      ),
    )
    .run()

  // Even numbers should generally complete before odd numbers started around same time
  expect(completionOrder).toHaveLength(10)
  // First few completions should include some even numbers
  const firstFew = completionOrder.slice(0, 4)
  expect(firstFew.some(n => n % 2 === 0)).toBe(true)
})

test('flush waits for all in-flight operations', async () => {
  const completed: number[] = []
  const data = _range(1, 6)

  await Pipeline.fromArray(data)
    .transform(
      transformMap(
        async n => {
          await pDelay(n * 10) // Varying delays: 10, 20, 30, 40, 50ms
          completed.push(n)
          return n
        },
        { concurrency: 5 }, // All start immediately
      ),
    )
    .run()

  // All items should complete before pipeline finishes
  expect(completed.sort((a, b) => a - b)).toEqual(data)
})

test('stress: large number of items with high concurrency', async () => {
  const itemCount = 1000
  const concurrency = 50
  let maxConcurrency = 0
  let current = 0

  const data = _range(1, itemCount + 1)

  const results = await Pipeline.fromArray(data)
    .transform(
      transformMap(
        async n => {
          current++
          maxConcurrency = Math.max(maxConcurrency, current)
          await pDelay(1)
          current--
          return n
        },
        { concurrency },
      ),
    )
    .toArray()

  expect(results).toHaveLength(itemCount)
  expect(maxConcurrency).toBeLessThanOrEqual(concurrency)
})

test('ordering: concurrency=1 preserves order', async () => {
  const data = _range(1, 21)

  const results = await Pipeline.fromArray(data)
    .transform(
      transformMap(
        async n => {
          await pDelay(Math.random() * 5)
          return n
        },
        { concurrency: 1 },
      ),
    )
    .toArray()

  // With concurrency=1, order is preserved
  expect(results).toEqual(data)
})

test('error handling: onError callback receives correct arguments', async () => {
  const errorsCaught: { err: Error; input: number }[] = []

  const data = _range(1, 6)

  await Pipeline.fromArray(data)
    .transform(
      transformMap(
        async n => {
          if (n === 3) throw new Error(`error for ${n}`)
          return n
        },
        {
          concurrency: 1,
          errorMode: ErrorMode.SUPPRESS,
          onError: (err, input) => {
            errorsCaught.push({ err, input })
          },
        },
      ),
    )
    .run()

  expect(errorsCaught).toHaveLength(1)
  expect(errorsCaught[0]!.input).toBe(3)
  expect(errorsCaught[0]!.err.message).toBe('error for 3')
})
