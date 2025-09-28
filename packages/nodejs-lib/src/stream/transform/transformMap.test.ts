import { MOCK_TS_2018_06_21 } from '@naturalcycles/dev-lib/testing/time'
import { _range } from '@naturalcycles/js-lib/array/range.js'
import { ErrorMode, pExpectedError } from '@naturalcycles/js-lib/error'
import { _stringify } from '@naturalcycles/js-lib/string/stringify.js'
import type { AsyncIndexedMapper } from '@naturalcycles/js-lib/types'
import { beforeAll, expect, test, vi } from 'vitest'
import { Pipeline, type TransformMapStats, transformMapStatsSummary } from '../index.js'

beforeAll(() => {
  vi.setSystemTime(MOCK_TS_2018_06_21 * 1000)
})

interface Item {
  id: string
}

// Mapper that throws 'my error' on third id
const mapperError3: AsyncIndexedMapper<Item, Item> = async item => {
  if (item.id === '3') throw new Error('my error')
  return item
}

test('transformMap simple', async () => {
  const data: Item[] = _range(1, 4).map(n => ({ id: String(n) }))
  const data2: Item[] = []

  await Pipeline.fromArray(data)
    .map(async r => void data2.push(r))
    .run()

  expect(data2).toEqual(data)
  // expect(readable.destroyed).toBe(true)
})

test('transformMap with mapping', async () => {
  const data: Item[] = _range(1, 4).map(n => ({ id: String(n) }))
  const data2 = await Pipeline.fromArray(data)
    .map(async r => ({
      id: r.id + '!',
    }))
    .toArray()

  expect(data2).toEqual(data.map(r => ({ id: r.id + '!' })))
})

test('transformMap emit array as multiple items', async () => {
  let stats: TransformMapStats
  const data = _range(1, 4)
  const data2 = await Pipeline.fromArray(data)
    .map(async n => [n * 2, n * 2 + 1], {
      // async is to test that it's awaited
      onDone: async s => (stats = s),
    })
    .flatten()
    .toArray()

  const expected: number[] = []
  data.forEach(n => {
    expected.push(n * 2, n * 2 + 1)
  })

  // console.log(data2)

  expect(data2).toEqual(expected)

  expect(stats!).toMatchInlineSnapshot(`
{
  "collectedErrors": [],
  "countErrors": 0,
  "countIn": 3,
  "countOut": 3,
  "ok": true,
  "started": 1529539200000,
}
`)
})

// non-object mode is not supported anymore
// test('transformMap objectMode=false', async () => {
//   const data: string[] = _range(1, 4).map(n => String(n))
//   const readable = Readable.from(data)
//
//   const data2: string[] = []
//
//   await _pipeline([
//     readable,
//     transformMap<Buffer, void>(r => void data2.push(String(r)), { objectMode: false }),
//   ])
//
//   expect(data2).toEqual(data)
// })

test('transformMap errorMode=THROW_IMMEDIATELY', async () => {
  let stats: TransformMapStats
  const data: Item[] = _range(1, 5).map(n => ({ id: String(n) }))
  const data2: Item[] = []

  await expect(
    Pipeline.fromArray(data)
      .map(mapperError3, { concurrency: 1, onDone: s => (stats = s) })
      .map(async r => void data2.push(r))
      .run(),
  ).rejects.toThrow('my error')

  expect(data2).toEqual(data.filter(r => Number(r.id) < 3))

  // expect(readable.destroyed).toBe(true)

  expect(stats!).toMatchInlineSnapshot(`
{
  "collectedErrors": [],
  "countErrors": 1,
  "countIn": 3,
  "countOut": 2,
  "ok": false,
  "started": 1529539200000,
}
`)
})

test('transformMap errorMode=THROW_AGGREGATED', async () => {
  let stats: TransformMapStats
  const data: Item[] = _range(1, 5).map(n => ({ id: String(n) }))
  const data2: Item[] = []

  const err = await pExpectedError(
    Pipeline.fromArray(data)
      .map(mapperError3, {
        errorMode: ErrorMode.THROW_AGGREGATED,
        onDone: s => (stats = s),
      })
      .map(async r => void data2.push(r))
      .run(),
    AggregateError,
  )
  expect(_stringify(err)).toMatchInlineSnapshot(`
    "AggregateError: transformMap resulted in 1 error(s)
    1 error(s):
    1. Error: my error"
  `)

  expect(data2).toEqual(data.filter(r => r.id !== '3'))

  // expect(readable.destroyed).toBe(true)

  expect(stats!).toMatchInlineSnapshot(`
{
  "collectedErrors": [
    [Error: my error],
  ],
  "countErrors": 1,
  "countIn": 4,
  "countOut": 3,
  "ok": false,
  "started": 1529539200000,
}
`)

  expect(transformMapStatsSummary(stats!)).toMatchInlineSnapshot(`
"### Transform summary

0 ms spent
4 / 3 row(s) in / out
1 error(s)"
`)

  expect(
    transformMapStatsSummary({
      ...stats!,
      name: 'MyCustomJob',
      extra: {
        key1: 'value1',
        n1: 145,
      },
    }),
  ).toMatchInlineSnapshot(`
"### MyCustomJob summary

0 ms spent
4 / 3 row(s) in / out
1 error(s)
key1: value1
n1: 145"
`)
})

test('transformMap errorMode=SUPPRESS', async () => {
  let stats: TransformMapStats
  const data: Item[] = _range(1, 5).map(n => ({ id: String(n) }))
  const data2: Item[] = []
  await Pipeline.fromArray(data)
    .map(mapperError3, { errorMode: ErrorMode.SUPPRESS, onDone: s => (stats = s) })
    .map(async r => void data2.push(r))
    .run()

  expect(data2).toEqual(data.filter(r => r.id !== '3'))

  // expect(readable.destroyed).toBe(true)

  expect(stats!).toMatchInlineSnapshot(`
{
  "collectedErrors": [],
  "countErrors": 1,
  "countIn": 4,
  "countOut": 3,
  "ok": true,
  "started": 1529539200000,
}
`)
})
