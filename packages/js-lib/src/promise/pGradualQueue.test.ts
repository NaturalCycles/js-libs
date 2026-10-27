import { expect, it } from 'vitest'
import { pDelay } from './pDelay.js'
import { PGradualQueue } from './pGradualQueue.js'

it('queued job rejection does not cause unhandledRejection', async () => {
  const q = new PGradualQueue({ concurrency: 2, warmupSeconds: 0 })
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
    await pDelay(10) // let Node flush unhandled-rejection detection
  } finally {
    process.off('unhandledRejection', onUnhandled)
  }

  expect(unhandled).toEqual([])
})

it('same function can be pushed multiple times', async () => {
  const q = new PGradualQueue({ concurrency: 1, warmupSeconds: 0 })
  let n = 0
  const fn = async (): Promise<number> => {
    await pDelay(1)
    return ++n
  }

  expect(await q.push(fn)).toBe(1)
  expect(await q.push(fn)).toBe(2)
  expect(await Promise.all([q.push(fn), q.push(fn)])).toEqual([3, 4])
})
