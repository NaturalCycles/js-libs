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

test('queued job rejection does not cause unhandledRejection', async () => {
  const q = new PQueue({ concurrency: 2 })
  const unhandled: unknown[] = []
  const onUnhandled = (err: unknown): void => void unhandled.push(err)
  process.on('unhandledRejection', onUnhandled)

  try {
    const p1 = q.push(() => pDelay(10, 1))
    const p2 = q.push(() => pDelay(10, 2))
    const p3 = q.push(async () => {
      throw new Error('queued fail')
    })
    expect(q.queueSize).toBe(1)

    await expect(p3).rejects.toThrow('queued fail')
    expect(await Promise.all([p1, p2])).toEqual([1, 2])
    await q.onIdle()
    await pDelay(10) // let Node flush unhandled-rejection detection
  } finally {
    process.off('unhandledRejection', onUnhandled)
  }

  expect(unhandled).toEqual([])
})
