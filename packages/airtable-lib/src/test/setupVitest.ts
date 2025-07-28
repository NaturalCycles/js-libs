import { testOffline } from '@naturalcycles/dev-lib/testing/testOffline'
import { afterAll, vi } from 'vitest'
testOffline()

afterAll(() => {
  vi.useRealTimers()
})
