import { expect, it } from 'vitest'
import { insertSQL } from './query.util.js'

it('should build one parameterized INSERT statement per row', () => {
  const rows = [
    { id: 'id1', k1: 'v1', k3: 1 },
    { id: 'id2', k1: 'v2' },
  ]

  expect(insertSQL('TEST_TABLE', rows)).toEqual([
    ['INSERT INTO TEST_TABLE (id, k1, k3) VALUES (?, ?, ?)', ['id1', 'v1', 1]],
    ['INSERT INTO TEST_TABLE (id, k1) VALUES (?, ?)', ['id2', 'v2']],
  ])
})
