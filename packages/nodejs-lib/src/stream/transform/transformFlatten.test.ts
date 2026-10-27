import { _range } from '@naturalcycles/js-lib/array/range.js'
import { expect, it } from 'vitest'
import { Pipeline } from '../pipeline.js'

it('should flatten arrays into single items', async () => {
  const data = _range(1, 4).map(n => _range(3).map(() => n))

  const data2 = await Pipeline.fromArray(data).flatten().toArray()

  expect(data2).toEqual(data.flat())
})
