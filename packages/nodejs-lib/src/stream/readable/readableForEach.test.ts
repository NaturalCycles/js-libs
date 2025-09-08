import { _range } from '@naturalcycles/js-lib/array/range.js'
import { expect, test } from 'vitest'
import { Pipeline } from '../index.js'

interface Item {
  id: string
}

test('readableForEachSync', async () => {
  const items: Item[] = _range(10).map(i => ({ id: `id_${i}` }))

  const ids: string[] = []

  await Pipeline.fromArray(items).forEachSync(item => {
    ids.push(item.id)
  })

  expect(ids).toEqual(items.map(i => i.id))
})

test('readableForEach', async () => {
  const items: Item[] = _range(10).map(i => ({ id: `id_${i}` }))

  const ids: string[] = []

  await Pipeline.fromArray(items).forEach(async item => {
    ids.push(item.id)
  })

  expect(ids).toEqual(items.map(i => i.id))
})
