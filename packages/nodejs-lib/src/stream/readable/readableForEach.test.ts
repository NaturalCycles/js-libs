import { _range } from '@naturalcycles/js-lib/array/range.js'
import { expect, it } from 'vitest'
import { Pipeline } from '../index.js'

interface Item {
  id: string
}

it('should call forEachSync for every item in order', async () => {
  const items: Item[] = _range(10).map(i => ({ id: `id_${i}` }))

  const ids: string[] = []

  await Pipeline.fromArray(items).forEachSync(item => {
    ids.push(item.id)
  })

  expect(ids).toEqual(items.map(i => i.id))
})

it('should call forEach for every item in order', async () => {
  const items: Item[] = _range(10).map(i => ({ id: `id_${i}` }))

  const ids: string[] = []

  await Pipeline.fromArray(items).forEach(async item => {
    ids.push(item.id)
  })

  expect(ids).toEqual(items.map(i => i.id))
})
