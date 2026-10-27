import { expect, it } from 'vitest'
import { _sortObjectDeep } from './sortObjectDeep.js'

it('should sort the keys at every level, keeping the values and the array order', () => {
  const o = {
    b: 2,
    a: 1,
    c: {
      d: {
        m: 4,
        j: 5,
        aa: 1,
      },
      m: 'sdf',
      dd: [3, 2, 1, 0, 55],
      ddd: ['b', 'c', 'a'],
      e: [{ y: 1, x: 2 }],
    },
    aa: 6,
  }

  const sorted = _sortObjectDeep(o)

  expect(Object.keys(sorted)).toEqual(['a', 'aa', 'b', 'c'])
  expect(Object.keys(sorted.c)).toEqual(['d', 'dd', 'ddd', 'e', 'm'])
  expect(Object.keys(sorted.c.d)).toEqual(['aa', 'j', 'm'])
  expect(Object.keys(sorted.c.e[0]!)).toEqual(['x', 'y'])
  expect(sorted).toStrictEqual(o)
})
