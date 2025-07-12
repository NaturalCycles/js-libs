import { _range } from '@naturalcycles/js-lib/array/range.js'
import { expect, test } from 'vitest'
import { _pipeline, readableFromArray } from '../index.js'
import { transformMap } from './transformMap.js'
import { transformToArray } from './transformToArray.js'

interface Item {
  id: string
}

test('transformToArray', async () => {
  const items: Item[] = _range(1, 6).map(num => ({
    id: String(num),
  }))
  const readable = readableFromArray(items)

  const items2: Item[] = []

  await _pipeline([
    readable,
    transformToArray<Item>(),
    transformMap<Item[], void>(rows => void items2.push(...rows)),
  ])
  expect(items2).toEqual(items)
})
