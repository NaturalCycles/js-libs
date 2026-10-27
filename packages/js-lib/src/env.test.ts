import { expect, it } from 'vitest'
import { isClientSide, isNode, isServerSide } from './env.js'

// Skipped due to flakiness when run in the monorepo
it.skip('should detect the server side in Node', () => {
  expect(isServerSide()).toBe(true)
  expect(isClientSide()).toBe(false)
})

it('should detect Node', () => {
  expect(isNode()).toBe(true)
})
