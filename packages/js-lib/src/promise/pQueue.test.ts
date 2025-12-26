import { expect, test } from 'vitest'
import { _range } from '../array/range.js'
import { pDelay, pMap } from './index.js'
import { PQueue } from './pQueue.js'

test('PQueue', async () => {
  const q = new PQueue({
    concurrency: 1,
    logLevel: 'debug',
  })

  expect(q.inFlight).toBe(0)
  expect(q.queueSize).toBe(0)

  await q.onIdle() // should resolve immediately, cause the queue is empty

  // 5 jobs with delay of 10ms each
  const results = await pMap(_range(1, 6), i => {
    return q.push(() => pDelay(10, i))
  })

  expect(results).toEqual(_range(1, 6))

  await expect(
    q.push(async () => {
      throw new Error('error123')
    }),
  ).rejects.toThrow('error123')

  await q.onIdle()
})
