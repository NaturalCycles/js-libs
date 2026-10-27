import { _range } from '@naturalcycles/js-lib/array/range.js'
import { afterEach, expect, it, vi } from 'vitest'
import { Pipeline } from '../pipeline.js'

afterEach(() => {
  vi.useRealTimers()
})

it('should pass all items through when RSS is below maxRSS', async () => {
  const items = _range(1, 11).map(id => ({ id: String(id) }))
  const result = await Pipeline.fromArray(items)
    .throttleByRSS({
      maxRSS: 10_000, // 10 GB — well above any test process RSS
      pollInterval: 10,
    })
    .toArray()

  expect(result).toEqual(items)
})

it('should pause after the first item while RSS is above maxRSS and pass the rest once it drops', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  const items = _range(1, 6).map(id => ({ id: String(id) }))
  const highRSS = 500 * 1024 * 1024 // 500 MB
  const lowRSS = 50 * 1024 * 1024 // 50 MB
  let callCount = 0
  const rssCallCountOnEmit: number[] = []

  vi.spyOn(process.memoryUsage, 'rss').mockImplementation(() => {
    // First few calls return high RSS to trigger pause,
    // then return low RSS to allow resume
    return ++callCount <= 3 ? highRSS : lowRSS
  })

  const promise = Pipeline.fromArray(items)
    .throttleByRSS({
      maxRSS: 100, // 100 MB
      pollInterval: 10,
    })
    .tapSync(() => {
      rssCallCountOnEmit.push(callCount)
    })
    .toArray()
  await vi.advanceTimersByTimeAsync(30)

  expect(await promise).toEqual(items)
  expect(rssCallCountOnEmit).toEqual([1, 4, 4, 4, 4])
})

it('should pass all items through after pollTimeout with open-the-floodgates', async () => {
  const items = _range(1, 6).map(id => ({ id: String(id) }))
  const highRSS = 500 * 1024 * 1024 // always high

  vi.spyOn(process.memoryUsage, 'rss').mockReturnValue(highRSS)

  const result = await Pipeline.fromArray(items)
    .throttleByRSS({
      maxRSS: 100,
      pollInterval: 10,
      pollTimeout: 50,
      onPollTimeout: 'open-the-floodgates',
    })
    .toArray()

  // All items should still pass through after timeout disables throttle
  expect(result).toEqual(items)
}, 10_000)

it('should reject after pollTimeout with onPollTimeout throw', async () => {
  const items = _range(1, 6).map(id => ({ id: String(id) }))
  const highRSS = 500 * 1024 * 1024 // always high

  vi.spyOn(process.memoryUsage, 'rss').mockReturnValue(highRSS)

  await expect(
    Pipeline.fromArray(items)
      .throttleByRSS({
        maxRSS: 100,
        pollInterval: 10,
        pollTimeout: 50,
        onPollTimeout: 'throw',
      })
      .toArray(),
  ).rejects.toThrow('pollTimeout')
}, 10_000)
