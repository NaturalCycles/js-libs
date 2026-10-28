import { _range } from '@naturalcycles/js-lib/array/range.js'
import { expect, it } from 'vitest'
import { Pipeline } from '../pipeline.js'

it('should pass only the first items with limit', async () => {
  const data = _range(1, 50).map(n => ({ id: String(n) }))

  const arr = await Pipeline.fromArray(data).limit(5).toArray()

  expect(arr).toEqual(data.slice(0, 5))
})
