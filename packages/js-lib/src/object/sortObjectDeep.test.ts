import { expect, it } from 'vitest'
import { _sortObjectDeep } from './sortObjectDeep.js'

it('should match the snapshot for a nested object', () => {
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
    },
    aa: 6,
  }

  // console.log(sortObjectDeep(o))
  expect(_sortObjectDeep(o)).toMatchSnapshot()
})
