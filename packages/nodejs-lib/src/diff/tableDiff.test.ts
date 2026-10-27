import { it } from 'vitest'
import { tableDiff } from './tableDiff.js'

it('should not throw when diffing empty, changed, added and nested objects', () => {
  tableDiff({}, {}, { logEmpty: true })
  tableDiff({}, {})

  tableDiff(
    {
      a: 'a1',
    },
    {
      a: 'b1',
    },
  )

  tableDiff(
    {
      a: 'a1',
      c: 'c1',
    },
    {
      b: 'b1',
      c: 'c1',
    },
  )

  tableDiff(
    {
      a: { aa: 'aa1' },
      c: 'c1',
    },
    {
      a: { aa: 'aa2' },
      c: 'c1',
    },
  )
})
