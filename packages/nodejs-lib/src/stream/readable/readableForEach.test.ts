import { _range } from '@naturalcycles/js-lib'
import { expect, test } from 'vitest'
import { readableFrom } from '../index.js'
import { readableForEach, readableForEachSync } from './readableForEach.js'

interface Item {
  id: string
}

test('readableForEachSync', async () => {
  const items: Item[] = _range(10).map(i => ({ id: `id_${i}` }))
  const readable = readableFrom(items)

  const ids: string[] = []

  await readableForEachSync(readable, item => {
    ids.push(item.id)
  })

  expect(ids).toEqual(items.map(i => i.id))
})

test('readableForEach', async () => {
  const items: Item[] = _range(10).map(i => ({ id: `id_${i}` }))
  const readable = readableFrom(items)

  const ids: string[] = []

  await readableForEach(
    readable,
    async item => {
      ids.push(item.id)
    },
    {},
  )

  expect(ids).toEqual(items.map(i => i.id))
})
