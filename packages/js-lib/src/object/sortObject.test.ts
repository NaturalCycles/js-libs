import { expect, it } from 'vitest'
import { _sortObject } from './sortObject.js'

interface Item {
  a: string
  b: string
  c: string
  d?: string
}

const keyOrder: (keyof Item)[] = ['a', 'b', 'c', 'd']

it('should put keys in the given order and extra keys last', () => {
  expect(
    Object.keys(
      _sortObject(
        {
          a: 'a',
          b: 'b',
          c: 'c',
          extra: 'e',
        } as Item,
        keyOrder,
      ),
    ),
  ).toEqual(['a', 'b', 'c', 'extra'])

  expect(
    Object.keys(
      _sortObject(
        {
          c: 'c',
          extra: 'e',
          b: 'b',
          a: 'a',
        } as Item,
        keyOrder,
      ),
    ),
  ).toEqual(['a', 'b', 'c', 'extra'])

  expect(
    Object.keys(
      _sortObject(
        {
          c: 'c',
          extra2: 'e',
          b: 'b',
          d: 'd',
          a: 'a',
        } as Item,
        keyOrder,
      ),
    ),
  ).toEqual(['a', 'b', 'c', 'd', 'extra2'])
})
