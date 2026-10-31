import { expect, it } from 'vitest'
import { DBQuery } from '../query/dbQuery.js'
import { queryInMemory } from './queryInMemory.js'

it('queryInMemory should not mutate the input rows array when sorting', () => {
  const rows = [
    { id: 'b', n: 2 },
    { id: 'a', n: 1 },
    { id: 'c', n: 3 },
  ]
  const q = DBQuery.create<(typeof rows)[number]>('t').order('n')

  expect(queryInMemory(q, rows).map(r => r.id)).toEqual(['a', 'b', 'c'])
  expect(rows.map(r => r.id)).toEqual(['b', 'a', 'c'])
})
