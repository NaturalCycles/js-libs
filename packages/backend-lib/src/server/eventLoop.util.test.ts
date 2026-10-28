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
    expect(value).toBeGreaterThanOrEqual(0)
  }
  expect(Object.keys(stats).sort()).toEqual([
    'elu',
    'gcCPU',
    'gcCount',
    'gcTotalTime',
    'max',
    'mean',
    'p50',
    'p90',
    'p99',
  ])
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
  expect(firstStats.gcCPU).toBe(Math.round((firstStats.gcTotalTime / 100) * 10_000))

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
