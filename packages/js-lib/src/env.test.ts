import { expect, test } from 'vitest'
import { isClientSide, isNode, isServerSide } from './env.js'

test('isServerSide', () => {
  expect(isServerSide()).toBe(true)
  expect(isClientSide()).toBe(false)
  expect(isNode()).toBe(true)
})
