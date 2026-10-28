import { _range } from '@naturalcycles/js-lib/array/range.js'
import { expect, it } from 'vitest'
import { Pipeline } from '../pipeline.js'

it('should pass all items through', async () => {
  const data = _range(1, 11).map(id => ({ id }))

  const results = await Pipeline.fromArray(data)
    .warmup({
      concurrency: 4,
      warmupSeconds: 0.1,
    })
    .toArray()

  expect(results).toEqual(data)
})

it('should pass all items through with warmupSeconds 0', async () => {
  const data = _range(1, 101).map(id => ({ id }))

  const results = await Pipeline.fromArray(data)
    .warmup({
      concurrency: 16,
      warmupSeconds: 0,
    })
    .toArray()

  expect(results).toEqual(data)
})

it('should pass all items through with concurrency 1', async () => {
  const data = _range(1, 21).map(id => ({ id }))

  const results = await Pipeline.fromArray(data)
    .warmup({
      concurrency: 1,
      warmupSeconds: 1,
    })
    .toArray()

  expect(results).toEqual(data)
})

it('should feed all items to a following Pipeline.map', async () => {
  const data = _range(1, 11).map(id => ({ id }))

  const results = await Pipeline.fromArray(data)
    .warmup({
      concurrency: 4,
      warmupSeconds: 0.1,
    })
    .map(async item => ({ ...item, processed: true }))
    .toArray()

  expect(results).toEqual(data.map(item => ({ ...item, processed: true })))
})
