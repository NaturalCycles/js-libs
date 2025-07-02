import { Readable } from 'node:stream'
import { _range } from '@naturalcycles/js-lib'
import { expect, test } from 'vitest'
import { _pipeline, writablePushToArray } from '../index.js'
import { transformChunk } from './transformChunk.js'

test('transformBuffer', async () => {
  const data = _range(1, 6).map(n => ({ id: String(n) }))

  const data2: any[] = []

  await _pipeline([
    Readable.from(data),
    transformChunk({ chunkSize: 2 }),
    writablePushToArray(data2),
  ])

  expect(data2).toEqual([[{ id: '1' }, { id: '2' }], [{ id: '3' }, { id: '4' }], [{ id: '5' }]])
})
