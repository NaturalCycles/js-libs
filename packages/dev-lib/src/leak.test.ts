import { it } from 'vitest'

it('should not leak', async () => {
  await import('./testing/index.js')
})
