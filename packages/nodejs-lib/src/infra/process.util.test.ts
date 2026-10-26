import { pDelay } from '@naturalcycles/js-lib/promise/pDelay.js'
import { expect, it } from 'vitest'
import { memoryUsage, memoryUsageFull, processSharedUtil } from './process.util.js'

it('cpuInfo', async () => {
  const c = processSharedUtil.cpuInfo()
  // console.log(c)
  expect(c).toHaveProperty('count')

  const num = await processSharedUtil.cpuPercent(100)
  expect(num).toBeGreaterThanOrEqual(0)
  expect(num).toBeLessThanOrEqual(1000)

  expect(processSharedUtil.cpuAvg()).toHaveProperty('avg1')
})

it('memoryUsage', async () => {
  const c = memoryUsage()
  // console.log(c)
  expect(c).toHaveProperty('heapUsed')

  expect(memoryUsageFull()).toHaveProperty('totalMem')
})

it('memoryTimer', async () => {
  processSharedUtil.startMemoryTimer(10)
  await pDelay(20)
  processSharedUtil.stopMemoryTimer(10)
  await pDelay(30)
})
