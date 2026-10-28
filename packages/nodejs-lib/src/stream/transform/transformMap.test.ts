import { _range } from '@naturalcycles/js-lib/array/range.js'
import { comparators } from '@naturalcycles/js-lib/array/sort.js'
import { ErrorMode } from '@naturalcycles/js-lib/error'
import { pDelay } from '@naturalcycles/js-lib/promise/pDelay.js'
import { SKIP } from '@naturalcycles/js-lib/types'
import { afterEach, expect, it, vi } from 'vitest'
import { Pipeline } from '../pipeline.js'
import type { TransformMapStats } from './transformMap.js'
import { transformMap } from './transformMap.js'

afterEach(() => {
  vi.useRealTimers()
})

it('should pass all items through with warmup', async () => {
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
  expect(results.sort(comparators.by(r => r.id))).toEqual(data)
})

it('should run one item at a time in the first second of a 2s warmup, 4 in the next, and 8 after it', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  const started = Date.now()
  const maxInFlightBySecond: number[] = []
  let inFlight = 0

  const promise = Pipeline.fromArray(_range(1, 81))
    .transform(
      transformMap(
        async item => {
          inFlight++
          const second = Math.floor((Date.now() - started) / 1000)
          maxInFlightBySecond[second] = Math.max(maxInFlightBySecond[second] ?? 0, inFlight)
          await pDelay(100)
          inFlight--
          return item
        },
        { concurrency: 8, warmupSeconds: 2 },
      ),
    )
    .run()
  await vi.runAllTimersAsync()
  await promise

  expect(maxInFlightBySecond).toEqual([1, 4, 8])
})

it('should start 8 items at once without warmup', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  const concurrencyLog: number[] = []
  let currentConcurrency = 0

  const data = _range(1, 21).map(id => ({ id }))

  const promise = Pipeline.fromArray(data)
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
  await vi.runAllTimersAsync()
  await promise

  expect(concurrencyLog.slice(0, 8)).toEqual(_range(1, 9))
  expect(Math.max(...concurrencyLog)).toBe(8)
})

it('should call onDone with ok stats and in and out counts', async () => {
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

it.each([
  { delays: 'random', delay: () => Math.random() * 10 },
  { delays: 'equal', delay: () => 5 },
])(
  'should never exceed the concurrency and reach it under load with $delays delays',
  async ({ delay }) => {
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
            await pDelay(delay())
            currentConcurrency--
            return n
          },
          { concurrency: targetConcurrency },
        ),
      )
      .run()

    expect(maxObservedConcurrency).toBe(targetConcurrency)
  },
)

it('should start and complete items in input order with concurrency 1', async () => {
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

it('should start the next item only when one of the 2 in flight completes with concurrency 2', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const events: string[] = []
  const concurrency = 2

  const data = _range(1, 6) // 5 items

  const promise = Pipeline.fromArray(data)
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
  await vi.runAllTimersAsync()
  await promise

  expect(events).toEqual([
    'start:1',
    'start:2',
    'end:2',
    'start:3',
    'end:3',
    'start:4',
    'end:4',
    'start:5',
    'end:5',
    'end:1',
  ])
})

// Edge cases

it('should emit nothing and report zero counts for an empty stream', async () => {
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

it('should map a single item', async () => {
  const results = await Pipeline.fromArray([42])
    .transform(transformMap(async n => n * 2, { concurrency: 4 }))
    .toArray()

  expect(results).toEqual([84])
})

it('should run all items at once when the concurrency exceeds the item count', async () => {
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

it('should drop items mapped to SKIP', async () => {
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

  expect(results.sort(comparators.numericAsc)).toEqual([1, 3, 5, 7, 9])
})

it('should keep only results matching the predicate', async () => {
  const data = _range(1, 11)

  const results = await Pipeline.fromArray(data)
    .transform(
      transformMap(async n => n * 2, {
        concurrency: 4,
        predicate: n => n > 10, // only keep results > 10
      }),
    )
    .toArray()

  expect(results.sort(comparators.numericAsc)).toEqual([12, 14, 16, 18, 20])
})

it('should keep only results matching the asyncPredicate', async () => {
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

  expect(results.sort(comparators.numericAsc)).toEqual([3, 6, 9])
})

// Race condition and timing tests

it('should let some fast items complete before slow ones', async () => {
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

it('should wait for all in-flight mappers before the pipeline resolves', async () => {
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
  expect(completed.sort(comparators.numericAsc)).toEqual(data)
})

it('should map 1000 items with concurrency 50 without exceeding it', async () => {
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

it('should preserve order with concurrency 1', async () => {
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

it('should call onError with the error and the input', async () => {
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
