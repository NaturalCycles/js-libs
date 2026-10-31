import { _range } from '@naturalcycles/js-lib/array/range.js'
import type { NonEmptyArray } from '@naturalcycles/js-lib/types'
import { expect, expectTypeOf, it } from 'vitest'
import { Pipeline } from '../index.js'

it('should group items into chunks of the given size', async () => {
  const data = _range(1, 6).map(n => ({ id: String(n) }))

  const data2 = await Pipeline.fromArray(data).chunk(2).toArray()

  expectTypeOf(data2).toEqualTypeOf<NonEmptyArray<{ id: string }>[]>()
  expect(data2).toEqual([[{ id: '1' }, { id: '2' }], [{ id: '3' }, { id: '4' }], [{ id: '5' }]])
})
