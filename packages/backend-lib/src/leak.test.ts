import { it } from 'vitest'

it('should not leak', async () => {
  await import('./index.js')
  await import('./testing/index.js')
})
