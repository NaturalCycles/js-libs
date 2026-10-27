import { expect, it, vi } from 'vitest'
import { isClientSide, isNode, isServerSide } from './env.js'

it('should detect the server side when there is no window', () => {
  vi.stubGlobal('window', undefined)
  expect(isServerSide()).toBe(true)
  expect(isClientSide()).toBe(false)
})

it('should detect the client side when window has a document', () => {
  vi.stubGlobal('window', { document: {} })
  expect(isServerSide()).toBe(false)
  expect(isClientSide()).toBe(true)
})

it('should detect Node', () => {
  expect(isNode()).toBe(true)
})
