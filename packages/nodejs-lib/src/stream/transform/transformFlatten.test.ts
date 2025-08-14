import { Readable } from 'node:stream'
import { _range } from '@naturalcycles/js-lib/array/range.js'
import { expect, test } from 'vitest'
import { _pipelineToArray } from '../pipeline/pipeline.js'
import { transformFlatten } from './transformFlatten.js'

test('transformFlatten', async () => {
  const data = _range(1, 4).map(n => _range(3).map(() => n))
  const readable = Readable.from(data)

  const data2 = await _pipelineToArray([readable, transformFlatten()])

  expect(data2).toEqual(data.flat())
})
