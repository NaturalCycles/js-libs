import { _range } from '@naturalcycles/js-lib/array/range.js'
import { expect, test } from 'vitest'
import { Pipeline } from '../pipeline.js'
import { transformNoOp } from './transformNoOp.js'

test('transformNoOp', async () => {
  const data = _range(1, 4).map(String)

  const data2: string[] = []

  await Pipeline.fromArray(data)
    .transform(transformNoOp())
    .mapSimple(r => void data2.push(r))
    .run()

  expect(data2).toEqual(data)
})
