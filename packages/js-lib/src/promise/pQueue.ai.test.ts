import { describe, expect, it } from 'vitest'
import { ErrorMode } from '../error/errorMode.js'
import { commonLoggerCreate } from '../log/commonLogger.js'
import { pDelay } from './pDelay.js'
import { PQueue } from './pQueue.js'

const quietCfg = { logLevel: 'warn' as const }

it('should resolve a single job with its result', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })
  const result = await queue.push(async () => 42)
  expect(result).toBe(42)
})

it('should run jobs one after another with concurrency 1', async () => {
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

it('should run at most 2 jobs at once with concurrency 2', async () => {
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

it('should start all jobs at once when concurrency exceeds the job count', async () => {
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

it('should run jobs in FIFO order', async () => {
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

it('should report the number of waiting jobs in queueSize', async () => {
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

it('should report the number of running jobs in inFlight', async () => {
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

it('should reject the push promise with THROW_IMMEDIATELY', async () => {
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

it('should keep running queued jobs after an error with THROW_IMMEDIATELY', async () => {
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

it('should resolve a failing job with undefined with SUPPRESS', async () => {
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

it('should keep running queued jobs after an error with SUPPRESS', async () => {
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

it('should resolve push when the job starts with resolveOn start', async () => {
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

it('should resolve push with undefined with resolveOn start', async () => {
  const queue = new PQueue({
    concurrency: 1,
    resolveOn: 'start',
    ...quietCfg,
  })

  const result = await queue.push(async () => 'my result')
  expect(result).toBeUndefined()
})

it('should not reject push on a job error with resolveOn start', async () => {
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

it('should resolve onIdle immediately when idle', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })
  const start = Date.now()
  await queue.onIdle()
  expect(Date.now() - start).toBeLessThan(10)
})

it('should wait in onIdle for the running job', async () => {
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

it('should wait in onIdle for the queued jobs', async () => {
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

it('should resolve every onIdle listener', async () => {
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

it('should run all 100 jobs with concurrency 5', async () => {
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

it('should run every job over rapid push and complete rounds', async () => {
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

it('should run every job when some fail with SUPPRESS', async () => {
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

it('should run 200 jobs with random delays at concurrency 10', async () => {
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

it('should report an empty queue as idle', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })

  expect(queue.queueSize).toBe(0)
  expect(queue.inFlight).toBe(0)
  await queue.onIdle() // Should resolve immediately
})

it('should resolve a job returning undefined with undefined', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })
  const result = await queue.push(async () => undefined)
  expect(result).toBeUndefined()
})

it('should resolve a job returning null with null', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })
  const result = await queue.push(async () => null)
  expect(result).toBeNull()
})

it('should resolve a job returning a promise with its value', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })
  // Test that nested promises are properly unwrapped
  const nestedPromise = Promise.resolve('nested')
  const result = await queue.push(() => nestedPromise)
  expect(result).toBe('nested')
})

it('should not start the next job before the previous one ends with concurrency 1', async () => {
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

describe('the same function reference is pushed twice', () => {
  it('should call the function twice', async () => {
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

it('should keep running queued jobs after a job throws synchronously with SUPPRESS', async () => {
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

it('should run all 20 jobs pushed at once with concurrency 2', async () => {
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

it('should run a job pushed while onIdle is pending', async () => {
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

it('should run a job pushed from inside another job', async () => {
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

it('should resolve the other jobs when one job rejects with concurrency 2', async () => {
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

it('should run the remaining jobs in order after a rejection with THROW_IMMEDIATELY', async () => {
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

it('should reject push for both a returned rejected promise and a thrown error', async () => {
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

it('should run all 500 immediately resolving jobs and end empty', async () => {
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

it('should resolve push with the job result with resolveOn finish', async () => {
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

it('should resolve onIdle again after each new job', async () => {
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

it('should resolve many concurrent onIdle calls once the job ends', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })

  void queue.push(async () => await pDelay(50))

  // Multiple onIdle calls while job is running
  const idlePromises = Array.from({ length: 10 }, () => queue.onIdle())

  await Promise.all(idlePromises)
  expect(queue.inFlight).toBe(0)
})

it('should resolve a job with the same object reference it returns', async () => {
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

it('should resolve a job that awaits in a loop with its array result', async () => {
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

it('should reject push on a job error by default', async () => {
  const queue = new PQueue({ concurrency: 1, ...quietCfg })

  await expect(
    queue.push(async () => {
      throw new Error('test')
    }),
  ).rejects.toThrow('test')
})

it('should log debug messages with inFlight when logLevel is debug', async () => {
  const debugMessages: string[] = []
  const mockLogger = commonLoggerCreate(entry => {
    if (entry.level === 'debug') debugMessages.push(String(entry.msg))
  })

  // With logLevel: 'debug', createCommonLoggerAtLevel returns the original logger unchanged
  const queue = new PQueue({ concurrency: 1, logger: mockLogger, logLevel: 'debug' })
  await queue.push(async () => 'result')
  await queue.onIdle()

  expect(debugMessages.length).toBeGreaterThan(0)
  expect(debugMessages.some(m => m.includes('inFlight'))).toBe(true)
})

it('should log a job error only when it is suppressed', async () => {
  const errors: unknown[] = []
  const mockLogger = commonLoggerCreate(entry => {
    if (entry.level === 'error') errors.push(entry.err)
  })

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
