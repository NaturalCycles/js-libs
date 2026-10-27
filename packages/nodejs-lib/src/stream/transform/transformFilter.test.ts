import { _range } from '@naturalcycles/js-lib/array/range.js'
import { expect, it } from 'vitest'
import { Pipeline } from '../index.js'

it('should keep items matching an async or sync predicate', async () => {
  const items = _range(5)

  let items2 = await Pipeline.fromArray(items)
    .filter(async n => n % 2 === 0)
    .toArray()

  expect(items2).toEqual([0, 2, 4])

  // reset
  items2 = await Pipeline.fromArray(items)
    .filterSync(n => n % 2 === 0)
    .toArray()

  expect(items2).toEqual([0, 2, 4])
})
