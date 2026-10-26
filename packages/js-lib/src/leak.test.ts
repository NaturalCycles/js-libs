import { it } from 'vitest'

it('should not leak', async () => {
  await import('./index.js')
})
