import { _range } from '@naturalcycles/js-lib/array/range.js'
import { expect, test } from 'vitest'
import { Pipeline } from '../index.js'

test('transformFilter', async () => {
  const items = _range(5)

  let items2 = await Pipeline.fromArray(items)
    .filter(n => n % 2 === 0)
    .toArray()

  expect(items2).toEqual([0, 2, 4])

  // reset
  items2 = await Pipeline.fromArray(items)
    .filterSync(n => n % 2 === 0)
    .toArray()

  expect(items2).toEqual([0, 2, 4])
})
