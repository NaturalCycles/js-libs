import { _range } from '@naturalcycles/js-lib'
import { expect, test } from 'vitest'
import { readableFrom } from '../index.js'
import { readableToArray } from './readableToArray.js'

test('readableToArray', async () => {
  const items = _range(5).map(String)
  const readable = readableFrom(items)
  const array = await readableToArray(readable)
  expect(array).toEqual(items)
})
