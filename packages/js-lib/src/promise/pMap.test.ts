import { afterEach, expect, test, vi } from 'vitest'
import { _range } from '../array/index.js'
import { AppError, ErrorMode, pExpectedError } from '../error/index.js'
import { _isBetween, _randomInt } from '../index.js'
import { timeSpan } from '../test/test.util.js'
import { type AsyncMapper, END, SKIP } from '../types.js'
import { pDelay } from './pDelay.js'
import { pMap } from './pMap.js'

afterEach(() => {
  vi.useRealTimers()
})

const input = [
  [10, 30],
  [20, 20],
  [30, 10],
]
const fastInput = [
  [10, 3],
  [20, 2],
  [30, 1],
]

const errorInput1 = [
  [20, 2],
  [30, 1],
  [() => Promise.reject(new Error('foo'))],
  [() => Promise.reject(new Error('bar'))],
]

const errorInput2 = [
  [20, 2],
  [() => Promise.reject(new Error('bar'))],
  [30, 1],
  [() => Promise.reject(new Error('foo'))],
]

const mapper: AsyncMapper = async ([val, ms]) => {
  if (typeof val === 'function') return val()
  return await pDelay(ms, val)
}

test('main', async () => {
  const end = timeSpan()
  expect(await pMap(input, mapper)).toEqual([10, 20, 30])
  expect(_isBetween(end(), 25, 80, '[)')).toBe(true)
})

test('concurrency: 1', async () => {
  const end = timeSpan()
  expect(await pMap(input, mapper, { concurrency: 1 })).toEqual([10, 20, 30])
  expect(_isBetween(end(), 55, 120, '[)')).toBe(true)
})

test('concurrency: 4', async () => {
  vi.useFakeTimers()
  const concurrency = 4
  let running = 0

  const promise = pMap(
    _range(100).map(() => 0),
    async () => {
      running++
      expect(running <= concurrency).toBe(true)
      await pDelay(_randomInt(3, 20))
      running--
    },
    { concurrency },
  )
  await vi.runAllTimersAsync()
  await promise
})

test('handles empty iterable', async () => {
  expect(await pMap([], mapper)).toEqual([])
})

test('async with concurrency: 2 (random time sequence)', async () => {
  vi.useFakeTimers()
  const input = _range(10).map(() => _randomInt(0, 100))
  const promise = pMap(input, v => pDelay(v, v), { concurrency: 2 })
  await vi.runAllTimersAsync()
  const result = await promise
  expect(result).toEqual(input)
})

test('async with concurrency: 2 (problematic time sequence)', async () => {
  vi.useFakeTimers()
  const input = [10, 20, 10, 36, 13, 45]
  const promise = pMap(input, v => pDelay(v, v), { concurrency: 2 })
  await vi.runAllTimersAsync()
  const result = await promise
  expect(result).toEqual(input)
})

test('async with concurrency: 2 (out of order time sequence)', async () => {
  vi.useFakeTimers()
  const input = [20, 10, 50]
  const promise = pMap(input, v => pDelay(v, v), { concurrency: 2 })
  await vi.runAllTimersAsync()
  const result = await promise
  expect(result).toEqual(input)
})

test('reject', async () => {
  vi.useFakeTimers()
  const input = [1, 1, 0, 1]
  const mapper: AsyncMapper = async v => {
    await pDelay(_randomInt(0, 100))
    if (!v) throw new Error('Err')
    return v
  }
  const promise = pMap(input, mapper, { concurrency: 1 }).catch(err => err)
  await vi.runAllTimersAsync()
  const result = await promise
  expect(result).toBeInstanceOf(Error)
  expect((result as Error).message).toBe('Err')
})

test('immediately rejects when errorMode=THROW_IMMEDIATELY', async () => {
  await expect(
    pMap(errorInput1, mapper, { concurrency: 1 }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: foo]`)

  await expect(
    pMap(errorInput2, mapper, { concurrency: 1 }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: bar]`)

  // infinite
  await expect(pMap(errorInput1, mapper)).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: foo]`)

  // limited
  await expect(
    pMap(errorInput1, mapper, { concurrency: 3 }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: foo]`)

  // high
  await expect(
    pMap(errorInput1, mapper, { concurrency: 5 }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: foo]`)
})

test('aggregate errors when errorMode=THROW_AGGREGATED', async () => {
  const errorMode = ErrorMode.THROW_AGGREGATED

  // should not throw
  await pMap(fastInput, mapper, { concurrency: 1, errorMode })
  await pMap(fastInput, mapper, { errorMode })

  await expect(
    pMap(errorInput1, mapper, { concurrency: 1, errorMode }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[AggregateError: pMap resulted in 2 error(s)]`)

  await expect(
    pMap(errorInput2, mapper, { concurrency: 1, errorMode }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[AggregateError: pMap resulted in 2 error(s)]`)

  let err = await pExpectedError(
    pMap(errorInput1, mapper, { concurrency: 1, errorMode }),
    AggregateError,
  )
  // expect(err.results).toEqual([20, 30])
  expect(err).toMatchInlineSnapshot('[AggregateError: pMap resulted in 2 error(s)]')
  expect(err.errors).toMatchInlineSnapshot(`
    [
      [Error: foo],
      [Error: bar],
    ]
  `)

  // infinite concurrency
  err = await pExpectedError(pMap(errorInput1, mapper, { errorMode }), AggregateError)
  // expect(err.results).toEqual([20, 30])
  expect(err).toMatchInlineSnapshot('[AggregateError: pMap resulted in 2 error(s)]')
  expect(err.errors).toMatchInlineSnapshot(`
    [
      [Error: foo],
      [Error: bar],
    ]
  `)

  // limited concurrency
  err = await pExpectedError(
    pMap(errorInput1, mapper, { concurrency: 3, errorMode }),
    AggregateError,
  )
  // expect(err.results).toEqual([20, 30])
  expect(err).toMatchInlineSnapshot('[AggregateError: pMap resulted in 2 error(s)]')
  expect(err.errors).toMatchInlineSnapshot(`
    [
      [Error: foo],
      [Error: bar],
    ]
  `)
})

test('suppress errors when errorMode=SUPPRESS', async () => {
  const errorMode = ErrorMode.SUPPRESS

  await pMap(fastInput, mapper, { concurrency: 1, errorMode })

  await pMap(errorInput1, mapper, { concurrency: 1, errorMode })
  await pMap(errorInput2, mapper, { concurrency: 1, errorMode })
})

test('SKIP', async () => {
  const values = _range(1, 4)
  const r = await pMap(values, async v => (v % 2 === 0 ? SKIP : v), { concurrency: 1 })
  expect(r).toEqual([1, 3])
})

test('END', async () => {
  const values = _range(1, 10)
  let r = await pMap(values, async v => (v === 3 ? END : v), { concurrency: 1 })
  expect(r).toEqual([1, 2])

  r = await pMap(values, async v => (v === 3 ? END : v), { concurrency: 5 })
  expect(r).toEqual([1, 2])

  r = await pMap(values, async v => (v === 3 ? END : v), { concurrency: 11 })
  // Because concurrency is 11, END cannot really stop the other values from being returned
  // (they're "in-flight")
  expect(r).toEqual([1, 2, 4, 5, 6, 7, 8, 9])
})

test('should preserve stack', async () => {
  const err = await pExpectedError(wrappingFn())

  // ok, it's tricky to make pMap to preserve the stack
  // currently it doesn't work :(
  // UPD: works for selected cases: infinite/limited/no concurrency
  // console.log(err)
  // console.log(err.stack)
  expect(err.stack).toContain('at pMap')
  expect(err.stack).toContain('at wrappingFn')
  expect(err.stack).toContain('at pExpectedError')
})

async function wrappingFn(): Promise<void> {
  await pMap([1, 2, 3], async n => await fn(n))
  // await Promise.all([1, 2, 3].map(n => fn(n)))
  // return await new Promise((resolve, reject) => {
  //   reject(new AppError('fn error'))
  // })
}

// Fails on 3
async function fn(n: number): Promise<number> {
  if (n === 3) {
    await pDelay(1)
    throw new AppError('fn error')
  }

  return n * 2
}

test('Infinity math', () => {
  const a = Infinity
  const b = Infinity
  expect(a).toBe(b)

  expect(a === b).toBe(true)

  expect(a === Infinity).toBe(true)
})

test('order is preserved', async () => {
  vi.useFakeTimers()
  const input = _range(6)
  const promise = pMap(input, async v => {
    await pDelay(100 - v * 20)
    // console.log('done', v)
    return v
  })
  await vi.runAllTimersAsync()
  const result = await promise
  // console.log(result)
  expect(result).toEqual(input)
})
