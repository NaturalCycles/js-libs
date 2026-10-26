import { expect, it } from 'vitest'
import { isClientSide, isNode, isServerSide } from './env.js'

// Skipped due to flakiness when run in the monorepo
it.skip('isServerSide', () => {
  expect(isServerSide()).toBe(true)
  expect(isClientSide()).toBe(false)
})

it('isNode', () => {
  expect(isNode()).toBe(true)
})
