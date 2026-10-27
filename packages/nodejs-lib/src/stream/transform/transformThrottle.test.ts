import { _range } from '@naturalcycles/js-lib/array/range.js'
import { afterEach, expect, it, vi } from 'vitest'
import { Pipeline } from '../pipeline.js'

afterEach(() => {
  vi.useRealTimers()
})

it('should pass at most throughput items per interval', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  const started = Date.now()
  const passedAfterMillis: number[] = []

  // super-fast producer
  const promise = Pipeline.fromArray(_range(1, 11).map(id => ({ id: String(id) })))
    // transformTap(obj => {
    //   console.log('pre', obj)
    // }),
    .throttle({
      interval: 1,
      throughput: 3,
      // debug: true,
    })
    .tapSync(() => {
      passedAfterMillis.push(Date.now() - started)
    })
    .run()
  await vi.advanceTimersByTimeAsync(3000)
  await promise

  expect(passedAfterMillis).toEqual([0, 0, 0, 1000, 1000, 1000, 2000, 2000, 2000, 3000])
})
