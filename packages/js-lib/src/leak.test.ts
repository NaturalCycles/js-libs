import { it } from 'vitest'

it('should import the package index without throwing', async () => {
  await import('./index.js')
})
