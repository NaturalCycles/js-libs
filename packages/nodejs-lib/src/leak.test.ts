import { it } from 'vitest'

it('should not leak', async () => {
  await import('./index.js')
  await import('./script/runScript.js')
  await import('./colors/colors.js')
})
