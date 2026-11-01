import { pDelay } from '@naturalcycles/js-lib/promise/pDelay.js'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { EventLoopMonitor } from './eventLoop.util.js'
import type { EventLoopStats } from './eventLoop.util.js'

let monitor: EventLoopMonitor | undefined

beforeEach(() => {
  // Real setTimeout stays, so the event-loop delay histogram can record samples
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
})

afterEach(() => {
  monitor?.stop()
  monitor = undefined
  vi.useRealTimers()
})

it('should call onStats with non-negative stats once per measureInterval', async () => {
  const onStats = vi.fn<(stats: EventLoopStats) => void>()
  monitor = new EventLoopMonitor({ measureInterval: 100, onStats })
  // Node < 24.19 samples the delay every 10 ms of real time; without a sample the mean is NaN
  await pDelay(20)

  await vi.advanceTimersByTimeAsync(99)
  expect(onStats).not.toHaveBeenCalled()

  await vi.advanceTimersByTimeAsync(1)
  expect(onStats).toHaveBeenCalledTimes(1)
  const stats = onStats.mock.calls[0]![0]
  for (const value of Object.values(stats)) {
    if (typeof value === 'number') expect(value).toBeGreaterThanOrEqual(0)
  }
  expect(Object.keys(stats).sort()).toEqual([
    'elu',
    'gcCPU',
    'gcCount',
    'gcMaxKind',
    'gcMaxTime',
    'gcTotalTime',
    'intervalMs',
    'max',
    'mean',
    'p50',
    'p90',
    'p99',
    'stallCpuMs',
    'stallMs',
  ])
  // intervalMs is the real elapsed time (at least the 20 ms delay above), not the faked 100 ms
  expect(stats.intervalMs).toBeGreaterThanOrEqual(15)
  expect(monitor.lastStats).toBe(stats)

  await vi.advanceTimersByTimeAsync(100)
  expect(onStats).toHaveBeenCalledTimes(2)
})

it('should report the gc stats of an interval and reset them for the next one', async () => {
  const onStats = vi.fn<(stats: EventLoopStats) => void>()
  monitor = new EventLoopMonitor({ measureInterval: 100, onStats })
  monitor.gcCount = 1000
  monitor.gcTotalTime = 50

  await vi.advanceTimersByTimeAsync(100)
  const firstStats = onStats.mock.calls[0]![0]
  expect(firstStats.gcCount).toBeGreaterThanOrEqual(1000)
  expect(firstStats.gcTotalTime).toBeGreaterThanOrEqual(50)
  // gcCPU is relative to the actual elapsed time, not the nominal measureInterval
  expect(firstStats.intervalMs).toBeGreaterThanOrEqual(1)
  expect(firstStats.gcCPU).toBe(
    Math.round((firstStats.gcTotalTime / firstStats.intervalMs) * 10_000),
  )

  await vi.advanceTimersByTimeAsync(100)
  const secondStats = onStats.mock.calls[1]![0]
  expect(secondStats.gcCount).toBeLessThan(1000)
  expect(secondStats.gcTotalTime).toBeLessThan(50)
})

it('should not call onStats after stop', async () => {
  const onStats = vi.fn<(stats: EventLoopStats) => void>()
  monitor = new EventLoopMonitor({ measureInterval: 50, onStats })

  monitor.stop()
  await vi.advanceTimersByTimeAsync(200)

  expect(onStats).not.toHaveBeenCalled()
})

it('should record a synchronous stall while sampling', async () => {
  const onStats = vi.fn<(stats: EventLoopStats) => void>()
  monitor = new EventLoopMonitor({ measureInterval: 100, onStats })

  await stallInTimerCallback(50)
  await pDelay(20)

  await vi.advanceTimersByTimeAsync(100)
  expect(onStats.mock.calls[0]![0].max).toBeGreaterThanOrEqual(40)
})

it('should not record a stall that ended with resume() in the same loop iteration', async () => {
  const onStats = vi.fn<(stats: EventLoopStats) => void>()
  monitor = new EventLoopMonitor({ measureInterval: 100, watchdogInterval: 10, onStats })
  const { pause, resume } = bind(monitor)

  pause()
  // Emulates a CPU-throttled idle instance woken by a request: the stall and the wake-up
  // event that resumes sampling happen in the same loop iteration
  await stallInTimerCallback(50, resume)
  await pDelay(20) // let sampled iterations happen

  await vi.advanceTimersByTimeAsync(100)
  const stats = onStats.mock.calls[0]![0]
  expect(stats.max).toBeLessThan(40)
  expect(stats.stallMs).toBeLessThan(40)
})

it('should measure a synchronous stall and the CPU it consumed', async () => {
  const onStats = vi.fn<(stats: EventLoopStats) => void>()
  monitor = new EventLoopMonitor({ measureInterval: 100, watchdogInterval: 10, onStats })

  await stallInTimerCallback(50) // busy wait: the stall is CPU work
  await vi.advanceTimersByTimeAsync(100)

  const stats = onStats.mock.calls[0]![0]
  expect(stats.stallMs).toBeGreaterThanOrEqual(35)
  expect(stats.stallCpuMs).toBeGreaterThanOrEqual(25)
})

it('should measure a stall during which the process was not running, with near-zero CPU', async () => {
  const onStats = vi.fn<(stats: EventLoopStats) => void>()
  monitor = new EventLoopMonitor({ measureInterval: 100, watchdogInterval: 10, onStats })

  await blockWithoutCpuInTimerCallback(50)
  await vi.advanceTimersByTimeAsync(100)

  const stats = onStats.mock.calls[0]![0]
  expect(stats.stallMs).toBeGreaterThanOrEqual(35)
  expect(stats.stallCpuMs).toBeLessThan(stats.stallMs / 2)

  // The next interval starts from zero
  await vi.advanceTimersByTimeAsync(100)
  expect(onStats.mock.calls[1]![0].stallMs).toBeLessThan(10)
})

it('should report the longest gc pause and its kind', async () => {
  const onStats = vi.fn<(stats: EventLoopStats) => void>()
  monitor = new EventLoopMonitor({ measureInterval: 100, onStats })

  // Enough garbage to trigger at least one collection
  let garbage: unknown[] = []
  for (let i = 0; i < 300_000; i++) garbage.push({ i, s: `x${i}` })
  garbage = []
  await pDelay(30) // gc entries reach the observer asynchronously

  await vi.advanceTimersByTimeAsync(100)
  const stats = onStats.mock.calls[0]![0]
  expect(stats.gcCount).toBeGreaterThanOrEqual(1)
  expect(stats.gcMaxTime).toBeLessThanOrEqual(Math.ceil(stats.gcTotalTime))
  expect(['major', 'minor', 'incremental', 'weakcb', 'unknown']).toContain(stats.gcMaxKind)
})

it('should keep the samples recorded before pause() after resume()', async () => {
  const onStats = vi.fn<(stats: EventLoopStats) => void>()
  monitor = new EventLoopMonitor({ measureInterval: 100, onStats })

  await stallInTimerCallback(50)
  await pDelay(20)
  monitor.pause()
  monitor.resume()
  monitor.resume() // no-op when not paused

  await vi.advanceTimersByTimeAsync(100)
  expect(onStats.mock.calls[0]![0].max).toBeGreaterThanOrEqual(40)
})

function bind(m: EventLoopMonitor): { pause: () => void; resume: () => void } {
  return { pause: () => m.pause(), resume: () => m.resume() }
}

/**
 * Blocks the thread for `ms` inside a (real) setTimeout callback without consuming CPU,
 * like a process that is not being scheduled.
 */
async function blockWithoutCpuInTimerCallback(ms: number): Promise<void> {
  await new Promise<void>(resolve => {
    setTimeout(() => {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
      resolve()
    }, 1)
  })
}

/**
 * Blocks the event loop for `ms` inside a (real) setTimeout callback,
 * then calls `after` in the same callback.
 */
async function stallInTimerCallback(ms: number, after?: () => void): Promise<void> {
  await new Promise<void>(resolve => {
    setTimeout(() => {
      const start = performance.now()
      while (performance.now() - start < ms) {
        // busy wait
      }
      after?.()
      resolve()
    }, 1)
  })
}
