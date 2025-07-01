import { Readable, Transform } from 'node:stream'
import type { ObjectWithId } from '@naturalcycles/js-lib'
import { _range, pExpectedErrorString } from '@naturalcycles/js-lib'
import { expect, test } from 'vitest'
import { _pipeline, writablePushToArray } from './index.js'

function errorTransformUnhandled(): Transform {
  return new Transform({
    objectMode: true,
    transform(chunk, _, cb) {
      if (chunk.id === '4') throw new Error('error_in_transform')
      cb(null, chunk)
    },
  })
}

function errorTransform(): Transform {
  return new Transform({
    objectMode: true,
    transform(chunk, _, cb) {
      if (chunk.id === '4') return cb(new Error('error_in_transform'))
      cb(null, chunk)
    },
  })
}

const errorMapper = (chunk: ObjectWithId): ObjectWithId => {
  if (chunk.id === '4') throw new Error('error_in_transform')
  return chunk
}

// still don't know how to handle such errors. Domains?
test.skip('unhandled transform error', async () => {
  const data = _range(1, 6).map(n => ({ id: String(n) }))
  const readable = Readable.from(data)

  const results: any[] = []
  await expect(
    _pipeline([readable, errorTransformUnhandled(), writablePushToArray(results)]),
  ).rejects.toThrow('error_in_transform')
})

test('handled transform error', async () => {
  const data = _range(1, 6).map(n => ({ id: String(n) }))
  const readable = Readable.from(data)

  const results: any[] = []
  await expect(
    _pipeline([readable, errorTransform(), writablePushToArray(results)]),
  ).rejects.toThrow('error_in_transform')
  // console.log(results)
  expect(results).toEqual(data.filter(r => r.id < '4'))
})

test('does map handle errors?', async () => {
  const data = _range(1, 6).map(n => ({ id: String(n) }))
  const readable = Readable.from(data)

  const s = await pExpectedErrorString(readable.map(errorMapper).toArray())
  expect(s).toMatchInlineSnapshot(`"Error: error_in_transform"`)
})
