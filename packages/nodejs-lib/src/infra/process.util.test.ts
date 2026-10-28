import { afterEach, expect, it, vi } from 'vitest'
import { memoryUsage, memoryUsageFull, processSharedUtil } from './process.util.js'

afterEach(() => {
  vi.useRealTimers()
})

it('should return cpu info, a cpu percent and load averages', async () => {
  const c = processSharedUtil.cpuInfo()
  // console.log(c)
  expect(c).toHaveProperty('count')

  const num = await processSharedUtil.cpuPercent(100)
  expect(num).toBeGreaterThanOrEqual(0)
  expect(num).toBeLessThanOrEqual(1000)

  expect(processSharedUtil.cpuAvg()).toHaveProperty('avg1')
})

it('should return memory usage with heapUsed and full usage with totalMem', async () => {
  const c = memoryUsage()
  // console.log(c)
  expect(c).toHaveProperty('heapUsed')

  expect(memoryUsageFull()).toHaveProperty('totalMem')
})

it('should log memory usage on start and on every interval until the timer is stopped', () => {
  vi.useFakeTimers()
  vi.spyOn(console, 'log').mockImplementation(() => {})

  processSharedUtil.startMemoryTimer(10)
  expect(console.log).toHaveBeenCalledOnce()
  expect(console.log).toHaveBeenLastCalledWith(
    expect.objectContaining({ heapUsed: expect.any(Number) }),
  )

  vi.advanceTimersByTime(25)
  expect(console.log).toHaveBeenCalledTimes(3)

  processSharedUtil.stopMemoryTimer(10)
  vi.advanceTimersByTime(100)
  expect(console.log).toHaveBeenCalledTimes(4)
})
