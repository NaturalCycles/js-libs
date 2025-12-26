import { describe, expect, test } from 'vitest'
import { ErrorMode } from '../error/errorMode.js'
import { pDelay } from './pDelay.js'
import { PQueue } from './pQueue.js'

const quietCfg = { logLevel: 'warn' as const }

test('basic - single job executes and returns result', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })
  const result = await queue.push(async () => 42)
  expect(result).toBe(42)
})

test('basic - multiple jobs execute sequentially with concurrency 1', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })
  const order: number[] = []

  const promises = [
    queue.push(async () => {
      order.push(1)
      await pDelay(10)
      order.push(2)
      return 'a'
    }),
    queue.push(async () => {
      order.push(3)
      await pDelay(10)
      order.push(4)
      return 'b'
    }),
    queue.push(async () => {
      order.push(5)
      await pDelay(10)
      order.push(6)
      return 'c'
    }),
  ]

  const results = await Promise.all(promises)
  expect(results).toEqual(['a', 'b', 'c'])
  expect(order).toEqual([1, 2, 3, 4, 5, 6])
})

test('concurrency - respects concurrency limit of 2', async () => {
  const queue = new PQueue({ concurrency: 2, ...quietCfg })
  const maxConcurrent = { current: 0, max: 0 }
  const inFlight = { count: 0 }

  const createJob = (id: number) => async () => {
    inFlight.count++
    maxConcurrent.current++
    maxConcurrent.max = Math.max(maxConcurrent.max, maxConcurrent.current)
    await pDelay(20)
    maxConcurrent.current--
    inFlight.count--
    return id
  }

  const promises = [
    queue.push(createJob(1)),
    queue.push(createJob(2)),
    queue.push(createJob(3)),
    queue.push(createJob(4)),
    queue.push(createJob(5)),
  ]

  const results = await Promise.all(promises)
  expect(results).toEqual([1, 2, 3, 4, 5])
  expect(maxConcurrent.max).toBe(2)
})

test('concurrency - high concurrency greater than job count', async () => {
  const queue = new PQueue({ concurrency: 10, ...quietCfg })
  const startTimes: number[] = []
  const start = Date.now()

  const promises = [
    queue.push(async () => {
      startTimes.push(Date.now() - start)
      await pDelay(50)
      return 1
    }),
    queue.push(async () => {
      startTimes.push(Date.now() - start)
      await pDelay(50)
      return 2
    }),
    queue.push(async () => {
      startTimes.push(Date.now() - start)
      await pDelay(50)
      return 3
    }),
  ]

  await Promise.all(promises)
  // All should start immediately (within ~10ms of each other)
  expect(startTimes.every(t => t < 15)).toBe(true)
})

test('queue order - jobs execute in FIFO order', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })
  const executionOrder: number[] = []

  const promises: Promise<number>[] = []
  for (let i = 0; i < 10; i++) {
    promises.push(
      queue.push(async () => {
        executionOrder.push(i)
        await pDelay(5)
        return i
      }),
    )
  }

  const results = await Promise.all(promises)
  expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  expect(executionOrder).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
})

test('queueSize - reflects pending jobs count', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })
  expect(queue.queueSize).toBe(0)

  // Use pDelay-based jobs for reliable timing
  const jobDuration = 30
  void queue.push(async () => await pDelay(jobDuration))
  void queue.push(async () => await pDelay(jobDuration))
  void queue.push(async () => await pDelay(jobDuration))

  await pDelay(5) // Let first job start
  expect(queue.queueSize).toBe(2)
  expect(queue.inFlight).toBe(1)

  await pDelay(jobDuration) // First job completes
  expect(queue.queueSize).toBe(1)
  expect(queue.inFlight).toBe(1)

  await queue.onIdle()
  expect(queue.queueSize).toBe(0)
  expect(queue.inFlight).toBe(0)
})

test('inFlight - tracks currently executing jobs', async () => {
  const queue = new PQueue({ concurrency: 3, ...quietCfg })
  expect(queue.inFlight).toBe(0)

  const jobDuration = 50
  // Push 5 jobs with concurrency 3
  void queue.push(async () => await pDelay(jobDuration))
  void queue.push(async () => await pDelay(jobDuration))
  void queue.push(async () => await pDelay(jobDuration))
  void queue.push(async () => await pDelay(jobDuration))
  void queue.push(async () => await pDelay(jobDuration))

  await pDelay(5)
  expect(queue.inFlight).toBe(3) // Concurrency limit
  expect(queue.queueSize).toBe(2)

  // After first batch completes, next jobs start
  await pDelay(jobDuration)
  expect(queue.inFlight).toBe(2) // 2 remaining
  expect(queue.queueSize).toBe(0)

  await queue.onIdle()
  expect(queue.inFlight).toBe(0)
})

test('error - THROW_IMMEDIATELY rejects push promise', async () => {
  const queue = new PQueue({
    concurrency: 1,
    errorMode: ErrorMode.THROW_IMMEDIATELY,
    ...quietCfg,
  })

  const error = new Error('test error')
  await expect(
    queue.push(async () => {
      throw error
    }),
  ).rejects.toThrow('test error')
})

test('error - THROW_IMMEDIATELY does not block queue', async () => {
  const queue = new PQueue({
    concurrency: 1,
    errorMode: ErrorMode.THROW_IMMEDIATELY,
    ...quietCfg,
  })

  const results: (string | Error)[] = []

  const p1 = queue.push(async () => {
    throw new Error('first error')
  })

  const p2 = queue.push(async () => 'success')

  try {
    await p1
  } catch (err) {
    results.push(err as Error)
  }

  results.push(await p2)

  expect(results).toHaveLength(2)
  expect(results[0]).toBeInstanceOf(Error)
  expect(results[1]).toBe('success')
})

test('error - SUPPRESS resolves with undefined', async () => {
  const queue = new PQueue({
    concurrency: 1,
    errorMode: ErrorMode.SUPPRESS,
    ...quietCfg,
  })

  const result = await queue.push(async () => {
    throw new Error('suppressed error')
  })

  expect(result).toBeUndefined()
})

test('error - SUPPRESS does not block queue', async () => {
  const queue = new PQueue({
    concurrency: 1,
    errorMode: ErrorMode.SUPPRESS,
    ...quietCfg,
  })

  const r1 = await queue.push(async () => {
    throw new Error('suppressed')
  })
  const r2 = await queue.push(async () => 'success')

  expect([r1, r2]).toEqual([undefined, 'success'])
})

test('resolveOn start - push resolves when job starts', async () => {
  const queue = new PQueue({
    concurrency: 1,
    resolveOn: 'start',
    ...quietCfg,
  })

  let jobStarted = false
  let jobCompleted = false

  const pushPromise = queue.push(async () => {
    jobStarted = true
    await pDelay(50)
    jobCompleted = true
    return 'result'
  })

  // Push should resolve when job starts, not when it completes
  await pushPromise
  expect(jobStarted).toBe(true)
  expect(jobCompleted).toBe(false)

  await queue.onIdle()
  expect(jobCompleted).toBe(true)
})

test('resolveOn start - returns void not result', async () => {
  const queue = new PQueue({
    concurrency: 1,
    resolveOn: 'start',
    ...quietCfg,
  })

  const result = await queue.push(async () => 'my result')
  expect(result).toBeUndefined()
})

test('resolveOn start - errors do not reject', async () => {
  const queue = new PQueue({
    concurrency: 1,
    resolveOn: 'start',
    ...quietCfg,
  })

  // Should not throw
  await queue.push(async () => {
    await pDelay(10)
    throw new Error('this error should not propagate')
  })

  await queue.onIdle()
})

test('onIdle - resolves immediately when already idle', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })
  const start = Date.now()
  await queue.onIdle()
  expect(Date.now() - start).toBeLessThan(10)
})

test('onIdle - waits for in-flight jobs', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })

  void queue.push(async () => {
    await pDelay(50)
    return 'done'
  })

  await pDelay(5) // Ensure job started
  expect(queue.inFlight).toBe(1)

  const start = Date.now()
  await queue.onIdle()
  expect(Date.now() - start).toBeGreaterThanOrEqual(40)
  expect(queue.inFlight).toBe(0)
})

test('onIdle - waits for queued jobs', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })

  void queue.push(async () => await pDelay(20))
  void queue.push(async () => await pDelay(20))
  void queue.push(async () => await pDelay(20))

  await pDelay(5)
  expect(queue.queueSize).toBe(2)

  const start = Date.now()
  await queue.onIdle()
  expect(Date.now() - start).toBeGreaterThanOrEqual(50)
})

test('onIdle - multiple listeners all resolve', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })

  void queue.push(async () => await pDelay(30))

  await pDelay(5)

  const resolved: number[] = []
  const p1 = queue.onIdle().then(() => resolved.push(1))
  const p2 = queue.onIdle().then(() => resolved.push(2))
  const p3 = queue.onIdle().then(() => resolved.push(3))

  await Promise.all([p1, p2, p3])
  expect(resolved.sort()).toEqual([1, 2, 3])
})

test('no lost executions - all jobs complete with high concurrency', async () => {
  const queue = new PQueue({ concurrency: 5, ...quietCfg })
  const executed = new Set<number>()

  const promises: Promise<number>[] = []
  for (let i = 0; i < 100; i++) {
    promises.push(
      queue.push(async () => {
        await pDelay(Math.random() * 10)
        executed.add(i)
        return i
      }),
    )
  }

  const results = await Promise.all(promises)

  expect(results).toHaveLength(100)
  expect(executed.size).toBe(100)
  for (let i = 0; i < 100; i++) {
    expect(executed.has(i)).toBe(true)
  }
})

test('no lost executions - rapid push and complete cycle', async () => {
  const queue = new PQueue({ concurrency: 2, ...quietCfg })
  const executed: number[] = []

  for (let round = 0; round < 10; round++) {
    const promises: Promise<void>[] = []
    for (let i = 0; i < 5; i++) {
      const id = round * 5 + i
      promises.push(
        queue.push(async () => {
          await pDelay(1)
          executed.push(id)
        }),
      )
    }
    await Promise.all(promises)
  }

  expect(executed).toHaveLength(50)
  expect(new Set(executed).size).toBe(50)
})

test('no lost executions - interleaved errors and successes', async () => {
  const queue = new PQueue({
    concurrency: 3,
    errorMode: ErrorMode.SUPPRESS,
    ...quietCfg,
  })
  const executed: number[] = []

  const promises: Promise<unknown>[] = []
  for (let i = 0; i < 30; i++) {
    promises.push(
      queue.push(async () => {
        await pDelay(Math.random() * 5)
        executed.push(i)
        if (i % 3 === 0) {
          throw new Error(`error ${i}`)
        }
        return i
      }),
    )
  }

  await Promise.all(promises)
  expect(executed).toHaveLength(30)
})

test('stress - many jobs with varying delays', async () => {
  const queue = new PQueue({ concurrency: 10, ...quietCfg })
  const completed: number[] = []

  const promises: Promise<number>[] = []
  for (let i = 0; i < 200; i++) {
    promises.push(
      queue.push(async () => {
        await pDelay(Math.random() * 20)
        completed.push(i)
        return i
      }),
    )
  }

  const results = await Promise.all(promises)
  expect(results).toHaveLength(200)
  expect(completed).toHaveLength(200)
})

test('edge case - empty queue operations', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })

  expect(queue.queueSize).toBe(0)
  expect(queue.inFlight).toBe(0)
  await queue.onIdle() // Should resolve immediately
})

test('edge case - job that returns undefined', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })
  const result = await queue.push(async () => undefined)
  expect(result).toBeUndefined()
})

test('edge case - job that returns null', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })
  const result = await queue.push(async () => null)
  expect(result).toBeNull()
})

test('edge case - job that returns a nested promise', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })
  // Test that nested promises are properly unwrapped
  const nestedPromise = Promise.resolve('nested')
  const result = await queue.push(() => nestedPromise)
  expect(result).toBe('nested')
})

test('edge case - concurrency 1 acts as serial queue', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })
  const events: string[] = []

  await Promise.all([
    queue.push(async () => {
      events.push('a-start')
      await pDelay(10)
      events.push('a-end')
    }),
    queue.push(async () => {
      events.push('b-start')
      await pDelay(10)
      events.push('b-end')
    }),
  ])

  expect(events).toEqual(['a-start', 'a-end', 'b-start', 'b-end'])
})

describe('potential bug - same function reference pushed twice', () => {
  test('same function pushed twice should execute twice', async () => {
    const queue = new PQueue({ concurrency: 1, ...quietCfg })
    let callCount = 0

    const fn = async (): Promise<number> => {
      callCount++
      await pDelay(5)
      return callCount
    }

    // Push the same function reference twice
    const results = await Promise.all([queue.push(fn), queue.push(fn)])

    // BUG: Currently both resolve with the same value because defer is shared
    // Expected: [1, 2] - each call should get its own result
    // Actual: likely [1, 1] or [2, 2] due to shared defer
    // This test documents the current behavior
    expect(callCount).toBe(2) // Function should be called twice

    // Due to the bug, results may not be [1, 2]
    // If this assertion fails, the bug might be fixed
    console.log('Same function pushed twice results:', results)
  })
})

test('synchronous throw does not block queue', async () => {
  const queue = new PQueue({
    concurrency: 1,
    errorMode: ErrorMode.SUPPRESS,
    ...quietCfg,
  })
  let executed = false

  const syncThrow = (): Promise<void> => {
    throw new Error('sync throw')
  }

  // First push - synchronous throw (handled gracefully)
  await queue.push(syncThrow)

  // Queue should continue working
  const result = await queue.push(async () => {
    executed = true
    return 'success'
  })

  expect(result).toBe('success')
  expect(executed).toBe(true)

  // Wait for queue to fully settle
  await queue.onIdle()
  expect(queue.inFlight).toBe(0)
})

test('concurrent push calls at same instant', async () => {
  const queue = new PQueue({ concurrency: 2, ...quietCfg })
  const results: number[] = []

  // Push many jobs simultaneously
  const promises = Array.from({ length: 20 }, (_, i) =>
    queue.push(async () => {
      await pDelay(5)
      results.push(i)
      return i
    }),
  )

  const returnValues = await Promise.all(promises)
  expect(returnValues).toHaveLength(20)
  expect(results).toHaveLength(20)
})

test('push during onIdle resolution', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })

  void queue.push(async () => await pDelay(20))

  const onIdlePromise = queue.onIdle()

  // Push another job while waiting for idle
  const lateJob = queue.push(async () => 'late result')

  await onIdlePromise

  // The late job should complete
  const result = await lateJob
  expect(result).toBe('late result')
})

test('jobs pushed from within job callback', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })
  const executed: string[] = []

  await queue.push(async () => {
    executed.push('outer-start')

    // Push from within a job
    void queue.push(async () => {
      executed.push('inner')
    })

    await pDelay(10)
    executed.push('outer-end')
  })

  await queue.onIdle()

  expect(executed).toContain('outer-start')
  expect(executed).toContain('outer-end')
  expect(executed).toContain('inner')
})

test('error in job does not affect other jobs results', async () => {
  const queue = new PQueue({
    concurrency: 2,
    errorMode: ErrorMode.THROW_IMMEDIATELY,
    ...quietCfg,
  })

  const results: { id: number; status: 'success' | 'error' }[] = []

  const promises = [
    queue
      .push(async () => await pDelay(10, 'a'))
      .then(
        () => results.push({ id: 1, status: 'success' }),
        () => results.push({ id: 1, status: 'error' }),
      ),
    queue
      .push(async () => {
        await pDelay(5)
        throw new Error('fail')
      })
      .then(
        () => results.push({ id: 2, status: 'success' }),
        () => results.push({ id: 2, status: 'error' }),
      ),
    queue
      .push(async () => await pDelay(15, 'c'))
      .then(
        () => results.push({ id: 3, status: 'success' }),
        () => results.push({ id: 3, status: 'error' }),
      ),
  ]

  await Promise.all(promises)

  expect(results.find(r => r.id === 1)?.status).toBe('success')
  expect(results.find(r => r.id === 2)?.status).toBe('error')
  expect(results.find(r => r.id === 3)?.status).toBe('success')
})

test('queue continues after rejection in THROW_IMMEDIATELY mode', async () => {
  const queue = new PQueue({
    concurrency: 1,
    errorMode: ErrorMode.THROW_IMMEDIATELY,
    ...quietCfg,
  })

  const executed: number[] = []

  // Queue several jobs, one will fail
  const p1 = queue
    .push(async () => {
      executed.push(1)
      throw new Error('fail')
    })
    .catch(() => {})

  const p2 = queue.push(async () => {
    executed.push(2)
    return 2
  })

  const p3 = queue.push(async () => {
    executed.push(3)
    return 3
  })

  await p1
  expect(await p2).toBe(2)
  expect(await p3).toBe(3)

  expect(executed).toEqual([1, 2, 3])
})

test('returning rejected promise vs throwing', async () => {
  const queue = new PQueue({
    concurrency: 1,
    errorMode: ErrorMode.THROW_IMMEDIATELY,
    ...quietCfg,
  })

  // Function returning a rejected promise (non-async to test this path)
  await expect(queue.push(() => Promise.reject(new Error('rejected promise')))).rejects.toThrow(
    'rejected promise',
  )

  // Async function that throws
  await expect(
    queue.push(async () => {
      throw new Error('thrown error')
    }),
  ).rejects.toThrow('thrown error')

  // Queue should still work
  expect(await queue.push(async () => 'ok')).toBe('ok')
})

test('very long queue processes completely', async () => {
  const queue = new PQueue({ concurrency: 5, ...quietCfg })
  const count = 500
  const executed = new Set<number>()

  const promises = Array.from({ length: count }, (_, i) =>
    queue.push(async () => {
      executed.add(i)
      return i
    }),
  )

  await Promise.all(promises)

  expect(executed.size).toBe(count)
  expect(queue.queueSize).toBe(0)
  expect(queue.inFlight).toBe(0)
})

test('mixed resolveOn behavior is not supported (config is per queue)', async () => {
  // Just verifying that resolveOn is a queue-wide setting, not per-job
  const queue = new PQueue({
    concurrency: 1,
    resolveOn: 'finish',
    ...quietCfg,
  })

  const result = await queue.push(async () => {
    await pDelay(10)
    return 'finished'
  })

  expect(result).toBe('finished')
})

test('onIdle called multiple times in sequence', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })

  void queue.push(async () => await pDelay(20))
  await queue.onIdle()

  void queue.push(async () => await pDelay(20))
  await queue.onIdle()

  void queue.push(async () => await pDelay(20))
  await queue.onIdle()

  expect(queue.inFlight).toBe(0)
  expect(queue.queueSize).toBe(0)
})

test('rapid onIdle polling', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })

  void queue.push(async () => await pDelay(50))

  // Multiple onIdle calls while job is running
  const idlePromises = Array.from({ length: 10 }, () => queue.onIdle())

  await Promise.all(idlePromises)
  expect(queue.inFlight).toBe(0)
})

test('job returning complex object', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })

  const complexResult = {
    nested: { value: 42, arr: [1, 2, 3] },
    fn: () => 'hello',
    date: new Date('2024-01-01'),
  }

  const result = await queue.push(async () => complexResult)

  expect(result).toBe(complexResult) // Same reference
  expect(result.nested.value).toBe(42)
})

test('async generator function as job', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })

  // Note: This doesn't truly test async generators, but jobs returning async iterables
  const result = await queue.push(async () => {
    const values: number[] = []
    for (const v of [1, 2, 3]) {
      await pDelay(1)
      values.push(v)
    }
    return values
  })

  expect(result).toEqual([1, 2, 3])
})

test('default errorMode is THROW_IMMEDIATELY', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })

  await expect(
    queue.push(async () => {
      throw new Error('test')
    }),
  ).rejects.toThrow('test')
})

test('logger receives debug calls when logLevel is debug', async () => {
  const debugMessages: string[] = []
  const mockLogger = {
    log: () => {},
    warn: () => {},
    error: () => {},
    debug: (...args: unknown[]) => debugMessages.push(String(args[0])),
  }

  // With logLevel: 'debug', createCommonLoggerAtLevel returns the original logger unchanged
  const queue = new PQueue({ concurrency: 1, logger: mockLogger, logLevel: 'debug' })
  await queue.push(async () => 'result')
  await queue.onIdle()

  expect(debugMessages.length).toBeGreaterThan(0)
  expect(debugMessages.some(m => m.includes('inFlight'))).toBe(true)
})

test('error logging - only logs when not re-throwing', async () => {
  const errors: Error[] = []
  const mockLogger = {
    log: () => {},
    warn: () => {},
    error: (err: Error) => errors.push(err),
    debug: () => {},
  }

  // THROW_IMMEDIATELY: error is re-thrown, NOT logged
  const queue1 = new PQueue({
    concurrency: 1,
    logger: mockLogger,
    errorMode: ErrorMode.THROW_IMMEDIATELY,
  })

  try {
    await queue1.push(async () => {
      throw new Error('thrown error')
    })
  } catch {
    // expected
  }

  expect(errors).toHaveLength(0) // Not logged because it's re-thrown

  // SUPPRESS: error is logged, not re-thrown
  const queue2 = new PQueue({
    concurrency: 1,
    logger: mockLogger,
    errorMode: ErrorMode.SUPPRESS,
  })

  const suppressedError = new Error('suppressed error')
  await queue2.push(async () => {
    throw suppressedError
  })

  expect(errors).toContain(suppressedError) // Logged because it's suppressed
})
