import { expect, it } from 'vitest'
import { _leven } from './leven.js'

it('should compute the Levenshtein distance, capped at the limit', () => {
  expect(_leven('cat', 'cat')).toBe(0)
  expect(_leven('cat', 'bat')).toBe(1)
  expect(_leven('cat', 'octocat')).toBe(4)

  // with limit
  expect(_leven('cat', 'octocat', 0)).toBe(0)
  expect(_leven('cat', 'octocat', 1)).toBe(1)
  expect(_leven('cat', 'octocat', 2)).toBe(2)
  expect(_leven('cat', 'octocat', 3)).toBe(3)
  expect(_leven('cat', 'octocat', 4)).toBe(4)
  expect(_leven('cat', 'octocat', 5)).toBe(4)
  expect(_leven('cat', 'octocat', 15)).toBe(4)
})
