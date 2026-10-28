import { Transform } from 'node:stream'
import { _range } from '@naturalcycles/js-lib/array/range.js'
import { expect, it } from 'vitest'
import { Pipeline, writablePushToArray } from './index.js'

it('should reject and keep the items before the error when a transform calls back with an error', async () => {
  const data = _range(1, 6).map(n => ({ id: String(n) }))

  const results: any[] = []
  await expect(
    Pipeline.fromArray(data).transform(errorTransform()).to(writablePushToArray(results)),
  ).rejects.toThrow('error_in_transform')
  // console.log(results)
  expect(results).toEqual(data.filter(r => r.id < '4'))
})

function errorTransform(): Transform {
  return new Transform({
    objectMode: true,
    transform(chunk, _, cb) {
      if (chunk.id === '4') return cb(new Error('error_in_transform'))
      cb(null, chunk)
    },
  })
}
