import { expect, test, vi } from 'vitest'
import { MOCK_TS_2018_06_21 } from './time.js'

const now = Date.now()

test('mockTime default', () => {
  expect(new Date().getFullYear()).toBeGreaterThan(2018)

  expect(Date.now()).toBeGreaterThanOrEqual(now)

  vi.setSystemTime(MOCK_TS_2018_06_21 * 1000)

  expect(Date.now()).toBe(MOCK_TS_2018_06_21 * 1000)

  vi.useRealTimers()

  expect(Date.now()).toBeGreaterThanOrEqual(now)
  expect(new Date().getFullYear()).toBeGreaterThan(2018)
})
