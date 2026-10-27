import { expect, it, vi } from 'vitest'
import { tableDiff } from './tableDiff.js'

it('should log nothing for equal objects, and no_difference only with logEmpty', () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'table').mockImplementation(() => {})

  tableDiff({}, {})
  tableDiff({ c: 'c1' }, { c: 'c1' })
  expect(console.log).not.toHaveBeenCalled()

  tableDiff({}, {}, { logEmpty: true })
  expect(console.log).toHaveBeenCalledExactlyOnceWith('no_difference')
  expect(console.table).not.toHaveBeenCalled()
})

it('should log a table of the changed, added and nested fields', () => {
  vi.spyOn(console, 'table').mockImplementation(() => {})

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

  expect(console.table).toHaveBeenCalledTimes(3)
  expect(console.table).toHaveBeenNthCalledWith(1, { a: { a: 'a1', b: 'b1' } })
  expect(console.table).toHaveBeenNthCalledWith(2, {
    a: { a: 'a1', b: undefined },
    b: { a: undefined, b: 'b1' },
  })
  expect(console.table).toHaveBeenNthCalledWith(3, { a: { a: { aa: 'aa1' }, b: { aa: 'aa2' } } })
})
