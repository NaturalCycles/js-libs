import { _range } from '@naturalcycles/js-lib/array/range.js'
import { expect, test } from 'vitest'
import { Pipeline } from '../index.js'

test('transformOffset', async () => {
  const data = _range(1, 30).map(n => ({ id: String(n) }))

  const arr = await Pipeline.fromArray(data).offset({ offset: 10 }).toArray()

  expect(arr).toEqual(data.slice(10))
})
