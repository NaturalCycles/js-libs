import { _range } from '@naturalcycles/js-lib/array/range.js'
import { expect, test } from 'vitest'
import { createReadableFrom } from '../index.js'
import { Pipeline } from '../pipeline.js'

test('transformLimit', async () => {
  const data = _range(1, 50).map(n => ({ id: String(n) }))

  const arr = await Pipeline.fromArray(data).limit(5).toArray()

  expect(arr).toEqual(data.slice(0, 5))
})

test('using .take', async () => {
  const data = _range(1, 50).map(n => ({ id: String(n) }))
  const readable = createReadableFrom(data)

  const arr = await readable.take(5).toArray()

  expect(arr).toEqual(data.slice(0, 5))
})

test('flatMap', async () => {
  const data = _range(1, 50).map(n => ({ id: n }))
  const readable = createReadableFrom(data)

  const arr = await readable
    .take(5)
    .flatMap(r => {
      if (r.id % 2) return [r]
      // return undefined // TypeError: undefined is not a function
      return []
    })
    .toArray()

  expect(arr).toEqual(data.slice(0, 5).filter(r => r.id % 2))
})
