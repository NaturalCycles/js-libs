import { pDelay } from '@naturalcycles/js-lib/promise'
import { expect, test } from 'vitest'
import { memoryUsage, memoryUsageFull, processSharedUtil } from './process.util.js'

test('cpuInfo', async () => {
  const c = processSharedUtil.cpuInfo()
  // console.log(c)
  expect(c).toHaveProperty('count')

  const num = await processSharedUtil.cpuPercent(100)
  expect(num).toBeGreaterThanOrEqual(0)
  expect(num).toBeLessThanOrEqual(1000)

  expect(processSharedUtil.cpuAvg()).toHaveProperty('avg1')
})

test('memoryUsage', async () => {
  const c = memoryUsage()
  // console.log(c)
  expect(c).toHaveProperty('heapUsed')

  expect(memoryUsageFull()).toHaveProperty('totalMem')
})

test('memoryTimer', async () => {
  processSharedUtil.startMemoryTimer(10)
  await pDelay(20)
  processSharedUtil.stopMemoryTimer(10)
  await pDelay(30)
})
