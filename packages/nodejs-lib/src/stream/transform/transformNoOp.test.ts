import { Readable } from 'node:stream'
import { _range } from '@naturalcycles/js-lib/array/range.js'
import { expect, test } from 'vitest'
import { _pipeline } from '../pipeline/pipeline.js'
import { writableVoid } from '../writable/writableVoid.js'
import { transformMapSimple } from './transformMapSimple.js'
import { transformNoOp } from './transformNoOp.js'

test('transformNoOp', async () => {
  const data = _range(1, 4).map(String)
  const readable = Readable.from(data)

  const data2: string[] = []

  await _pipeline([
    readable,
    transformNoOp(),
    transformMapSimple<string, void>(r => void data2.push(r)),
    writableVoid(),
  ])

  expect(data2).toEqual(data)
})
