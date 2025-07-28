import { afterAll, vi } from 'vitest'
import { testOffline } from '../testing/testOffline.js'
testOffline()

afterAll(() => {
  vi.useRealTimers()
})
