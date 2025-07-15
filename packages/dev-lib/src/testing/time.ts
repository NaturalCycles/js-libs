import type { UnixTimestamp } from '@naturalcycles/js-lib/types'
import timekeeper from 'timekeeper'

export const MOCK_TS_2018_06_21 = 1529539200 as UnixTimestamp

/**
 * Locks time-related functions to return always same time.
 * For deterministic tests.
 *
 * @deprecated Prefer vi.setSystemTime() in Vitest.
 * E.g vi.setSystemTime(MOCK_TS_2018_06_21 * 1000)
 */
export function mockTime(ts = MOCK_TS_2018_06_21): void {
  timekeeper.freeze(ts * 1000)
}

/**
 * @deprecated Prefer vi.useRealTimers() in Vitest.
 */
export function resetTime(): void {
  timekeeper.reset()
}
