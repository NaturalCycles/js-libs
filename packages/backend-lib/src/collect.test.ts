import { test } from 'vitest'
import { isGAE } from './index.js'

test('collect time', () => {
  // router is gae
  const _router = isGAE()
})
