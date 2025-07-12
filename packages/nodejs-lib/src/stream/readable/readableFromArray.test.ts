import { _range } from '@naturalcycles/js-lib/array/range.js'
import { pDelay } from '@naturalcycles/js-lib/promise/pDelay.js'
import { expect, test } from 'vitest'
import { readableFromArray } from '../index.js'

test('readableFromArray', async () => {
  const items = _range(1, 11)

  const readable = readableFromArray(items, async item => await pDelay(10, item))

  const r = await readable.toArray()

  expect(r).toEqual(items)
})
