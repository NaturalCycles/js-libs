import { afterEach, test, vi } from 'vitest'
import { _since } from '../datetime/index.js'
import { pDelay } from '../promise/index.js'
import type { AnyFunction, UnixTimestampMillis } from '../types.js'
import { _debounce } from './debounce.js'

afterEach(() => {
  vi.useRealTimers()
})

const originalFn = (started: UnixTimestampMillis, n: number): void =>
  console.log(`#${n} after ${_since(started)}`)

async function startTimer(fn: AnyFunction, interval: number, count: number): Promise<void> {
  const started = Date.now() as UnixTimestampMillis

  for (let i = 0; i < count; i++) {
    await pDelay(interval)
    fn(started, i + 1)
  }

  await pDelay(2000) // extra wait
}

test('_debounce', async () => {
  vi.useFakeTimers()

  const fn = _debounce(originalFn, 20, { leading: true, trailing: true, maxWait: 300 })

  const promise = startTimer(fn, 10, 10)
  await vi.runAllTimersAsync()
  await promise
})

// Test cases:
// _debounce leading=1 trailing=0 (default)
// _debounce leading=1 trailing=1
// _debounce leading=0 trailing=1
// _debounce leading=0 trailing=0
// _throttle leading=1 trailing=1 (default)
// _throttle leading=1 trailing=0
// _throttle leading=0 trailing=1
// _throttle leading=0 trailing=0
