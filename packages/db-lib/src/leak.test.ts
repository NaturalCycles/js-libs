import { it } from 'vitest'

it('should not leak memory', async () => {
  await import('./index.js')
  await import('./validation/index.js')
  await import('./testing/index.js')
  await import('./adapter/cachedb/index.js')
})
