import { _range } from '@naturalcycles/js-lib/array/range.js'
import { expect, test } from 'vitest'
import { Pipeline } from '../index.js'
import { transformToArray } from './transformToArray.js'

interface Item {
  id: string
}

test('transformToArray', async () => {
  const items: Item[] = _range(1, 6).map(num => ({
    id: String(num),
  }))
  const items2: Item[] = []

  await Pipeline.fromArray(items)
    .transform(transformToArray())
    .map(rows => void items2.push(...rows))
    .run()

  expect(items2).toEqual(items)
})
