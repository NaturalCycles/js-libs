import { expect, test } from 'vitest'
import { isClientSide, isNode, isServerSide } from './env.js'

// Skipped due to flakiness when run in the monorepo
test.skip('isServerSide', () => {
  expect(isServerSide()).toBe(true)
  expect(isClientSide()).toBe(false)
})

test('isNode', () => {
  expect(isNode()).toBe(true)
})
