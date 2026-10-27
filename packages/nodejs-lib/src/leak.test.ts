import { it } from 'vitest'

it('should import the main modules without throwing', async () => {
  await import('./index.js')
  await import('./script/runScript.js')
  await import('./colors/colors.js')
})
