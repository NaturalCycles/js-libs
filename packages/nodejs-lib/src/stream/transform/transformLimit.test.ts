import { _range } from '@naturalcycles/js-lib'
import { expect, test } from 'vitest'
import { readableFrom, readableFromArray } from '../index.js'
import { _pipelineToArray } from '../pipeline/pipeline.js'
import { transformLimit } from './transformLimit.js'

test('transformLimit', async () => {
  const data = _range(1, 50).map(n => ({ id: String(n) }))
  const readable = readableFromArray(data)

  const arr = await _pipelineToArray([
    readable,
    // transformTap((r, i) => console.log(i)),
    transformLimit({ limit: 5 }),
  ])

  expect(arr).toEqual(data.slice(0, 5))
})

test('transformLimit with readable.destroy', async () => {
  const data = _range(1, 50).map(n => ({ id: String(n) }))
  const sourceReadable = readableFromArray(data)

  const arr = await _pipelineToArray(
    [
      sourceReadable,
      // transformTap((r, i) => console.log(i)),
      transformLimit({ limit: 5, sourceReadable }),
    ],
    { allowClose: true },
  )

  expect(arr).toEqual(data.slice(0, 5))
})

test('using .take', async () => {
  const data = _range(1, 50).map(n => ({ id: String(n) }))
  const readable = readableFrom(data)

  const arr = await readable.take(5).toArray()

  expect(arr).toEqual(data.slice(0, 5))
})

test('flatMap', async () => {
  const data = _range(1, 50).map(n => ({ id: n }))
  const readable = readableFrom(data)

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
