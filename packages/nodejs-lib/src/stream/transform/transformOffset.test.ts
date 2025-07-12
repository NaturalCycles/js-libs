import { _range } from '@naturalcycles/js-lib/array/range.js'
import { expect, test } from 'vitest'
import { readableFrom } from '../index.js'
import { _pipelineToArray } from '../pipeline/pipeline.js'
import { transformOffset } from './transformOffset.js'

test('transformOffset', async () => {
  const data = _range(1, 30).map(n => ({ id: String(n) }))
  const readable = readableFrom(data)

  const arr = await _pipelineToArray([
    readable,
    // transformTap((r, i) => console.log(i)),
    transformOffset({ offset: 10 }),
  ])

  expect(arr).toEqual(data.slice(10))
})
