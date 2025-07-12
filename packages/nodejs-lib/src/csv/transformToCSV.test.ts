import { Readable } from 'node:stream'
import { _range } from '@naturalcycles/js-lib/array/range.js'
import { expect, test } from 'vitest'
import { _pipeline } from '../stream/pipeline/pipeline.js'
import { writablePushToArray } from '../stream/writable/writablePushToArray.js'
import { csvStringParse } from './csvReader.js'
import { arrayToCSVString } from './csvWriter.js'
import { transformToCSV } from './transformToCSV.js'

interface Item {
  id: string
  k: string
  k2: string
  k3: string
  n?: number
  b?: boolean
}

const items: Item[] = _range(1, 11).map(i => ({
  id: `id${i}`,
  k: `k ${i}`,
  k2: `"yo ${i}"`,
  k3: `hey,\n${i}`,
  b: i % 2 === 0,
  n: i % 2 ? i : undefined,
}))

test('transformToCSV', async () => {
  const rows: string[] = []

  await _pipeline([
    Readable.from(items),
    transformToCSV({
      columns: ['id', 'k', 'k2', 'n', 'b'],
    }),
    writablePushToArray(rows, {
      objectMode: false,
    }),
  ])

  const str = rows.join('')
  expect(str).toMatchInlineSnapshot(`
    "id,k,k2,n,b
    id1,k 1,"""yo 1""",1,false
    id2,k 2,"""yo 2""",,true
    id3,k 3,"""yo 3""",3,false
    id4,k 4,"""yo 4""",,true
    id5,k 5,"""yo 5""",5,false
    id6,k 6,"""yo 6""",,true
    id7,k 7,"""yo 7""",7,false
    id8,k 8,"""yo 8""",,true
    id9,k 9,"""yo 9""",9,false
    id10,k 10,"""yo 10""",,true
    "
  `)
})

test('arrayToCSVString', () => {
  // Headers should not be printed on empty rows input
  expect(arrayToCSVString([])).toBe('')

  // No headers even if columns where provided
  expect(
    arrayToCSVString([], {
      columns: ['a', 'b'],
    }),
  ).toBe('')

  expect(arrayToCSVString(items)).toMatchInlineSnapshot(`
    "id,k,k2,k3,b,n
    id1,k 1,"""yo 1""","hey,
    1",false,1
    id2,k 2,"""yo 2""","hey,
    2",true,
    id3,k 3,"""yo 3""","hey,
    3",false,3
    id4,k 4,"""yo 4""","hey,
    4",true,
    id5,k 5,"""yo 5""","hey,
    5",false,5
    id6,k 6,"""yo 6""","hey,
    6",true,
    id7,k 7,"""yo 7""","hey,
    7",false,7
    id8,k 8,"""yo 8""","hey,
    8",true,
    id9,k 9,"""yo 9""","hey,
    9",false,9
    id10,k 10,"""yo 10""","hey,
    10",true,"
  `)

  // Columns should be detected even when includeHeader == false
  expect(
    arrayToCSVString(items.slice(0, 2), {
      includeHeader: false,
    }),
  ).toMatchInlineSnapshot(`
    "id1,k 1,"""yo 1""","hey,
    1",false,1
    id2,k 2,"""yo 2""","hey,
    2",true,"
  `)
})

test('csvStringParse', () => {
  const str = `id,k,k2,n,b
id1,k 1,"""yo 1""",1,false
id2,k 2,"""yo 2""",,true
id3,k 3,"""yo 3""",3,false`

  const rows = csvStringParse(str)
  expect(rows).toMatchInlineSnapshot(`
    [
      {
        "b": "false",
        "id": "id1",
        "k": "k 1",
        "k2": ""yo 1"",
        "n": "1",
      },
      {
        "b": "true",
        "id": "id2",
        "k": "k 2",
        "k2": ""yo 2"",
        "n": "",
      },
      {
        "b": "false",
        "id": "id3",
        "k": "k 3",
        "k2": ""yo 3"",
        "n": "3",
      },
    ]
  `)
})
