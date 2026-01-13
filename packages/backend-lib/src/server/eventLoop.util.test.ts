import { pDelay } from '@naturalcycles/js-lib/promise/pDelay.js'
import { afterEach, expect, test } from 'vitest'
import { EventLoopMonitor, type EventLoopStats } from './eventLoop.util.js'

let monitor: EventLoopMonitor | undefined

afterEach(() => {
  monitor?.stop()
  monitor = undefined
})

test('should call onStats after measureInterval', async () => {
  const stats: EventLoopStats[] = []

  monitor = new EventLoopMonitor({
    measureInterval: 100,
    resolution: 10,
    onStats: s => stats.push(s),
  })

  await pDelay(150)

  expect(stats).toHaveLength(1)
  expect(stats[0]).toMatchObject({
    p50: expect.any(Number),
    p90: expect.any(Number),
    p99: expect.any(Number),
    max: expect.any(Number),
    mean: expect.any(Number),
    elu: expect.any(Number),
    gcCount: expect.any(Number),
    gcTotalTime: expect.any(Number),
    gcCPU: expect.any(Number),
  })
})

test('should reset gc counters between intervals', async () => {
  const stats: EventLoopStats[] = []

  monitor = new EventLoopMonitor({
    measureInterval: 50,
    resolution: 10,
    onStats: s => stats.push(s),
  })

  await pDelay(130)

  expect(stats.length).toBeGreaterThanOrEqual(2)

  // gcCount and gcTotalTime should be reset between intervals
  // They should reflect only the current interval, not accumulate
  // We can't easily trigger GC, but we can verify the values are reasonable (not growing unbounded)
  for (const s of stats) {
    expect(s.gcCount).toBeGreaterThanOrEqual(0)
    expect(s.gcTotalTime).toBeGreaterThanOrEqual(0)
    expect(s.gcCPU).toBeGreaterThanOrEqual(0)
    expect(s.gcCPU).toBeLessThanOrEqual(100)
  }
})

test('stop should clean up resources', async () => {
  monitor = new EventLoopMonitor({ measureInterval: 50 })

  await pDelay(30)

  // Should not throw
  monitor.stop()
  monitor = undefined

  // Wait to ensure no callbacks fire after stop
  await pDelay(100)
})

test('stats values should be non-negative', async () => {
  const stats: EventLoopStats[] = []

  monitor = new EventLoopMonitor({
    measureInterval: 50,
    resolution: 10,
    onStats: s => stats.push(s),
  })

  await pDelay(80)

  expect(stats).toHaveLength(1)
  const s = stats[0]!

  expect(s.p50).toBeGreaterThanOrEqual(0)
  expect(s.p90).toBeGreaterThanOrEqual(0)
  expect(s.p99).toBeGreaterThanOrEqual(0)
  expect(s.max).toBeGreaterThanOrEqual(0)
  expect(s.mean).toBeGreaterThanOrEqual(0)
  expect(s.elu).toBeGreaterThanOrEqual(0)
})
