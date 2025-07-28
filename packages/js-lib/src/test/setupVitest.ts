import { testOffline } from '@naturalcycles/dev-lib/testing/testOffline'
import { afterAll, vi } from 'vitest'
testOffline()

// vi.unstubAllEnvs()
vi.unstubAllGlobals()

afterAll(() => {
  vi.useRealTimers()
})
