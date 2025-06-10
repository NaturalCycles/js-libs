import { expect, test } from 'vitest'
import { TimeoutError } from '../error/error.util.js'
import { pExpectedError } from '../error/try.js'
import { normalizeStack } from '../test/test.util.js'
import type { AnyFunction } from '../types.js'
import { pDelay } from './pDelay.js'
import { pRetry, pRetryFn } from './pRetry.js'

function createFn(succeedOnAttempt: number): AnyFunction {
  let attempt = 0
  return async function someFn(...args: any[]) {
    attempt++
    // console.log(`fn called attempt=${attempt}`, {args})
    if (attempt >= succeedOnAttempt) {
      return args
    }

    throw new Error('fail')
  }
}

test('pRetryFn', async () => {
  const fn = pRetryFn(createFn(3), {
    maxAttempts: 3,
    delay: 10,
    delayMultiplier: 1,
    logAll: true,
    // predicate: () => false,
    // logNone: true,
  })
  const r = await fn(1, 2, 3)
  // console.log(r)
  expect(r).toEqual([1, 2, 3])
})

test('pRetryFn should throw on fail', async () => {
  const fn = pRetryFn(createFn(3), {
    maxAttempts: 2, // so, it'll never succeed
    delay: 10,
    delayMultiplier: 1,
    logAll: true,
  })
  await expect(fn(1, 2, 3)).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: fail]`)
})

test('pRetry', async () => {
  const r = await pRetry(
    async attempt => {
      if (attempt >= 3) return attempt
      throw new Error('fail')
    },
    {
      maxAttempts: 3,
      delay: 10,
      delayMultiplier: 1,
      logAll: true,
    },
  )
  expect(r).toBe(3)
})

test('pRetry with timeout', async () => {
  const r = await pRetry(
    async attempt => {
      if (attempt >= 3) return attempt
      throw new Error('fail')
    },
    {
      maxAttempts: 3,
      delay: 10,
      delayMultiplier: 1,
      timeout: 100,
    },
  )
  expect(r).toBe(3)
})

test('pRetry should throw on fail and keep stack', async () => {
  async function myFunction(): Promise<void> {
    await pRetry(
      async attempt => {
        if (attempt >= 3) return attempt
        throw new Error('fail')
      },
      {
        maxAttempts: 2, // so, it'll never succeed
        delay: 10,
        delayMultiplier: 1,
        logAll: true,
      },
    )
  }

  const err = await pExpectedError(myFunction())
  // console.log(err)

  expect(err).toMatchInlineSnapshot('[Error: fail]')
  expect(err.stack).not.toContain('TimeoutError')
  expect(err.stack).toContain('at myFunction')
})

test('pRetry timeout should not happen', async () => {
  await pRetry(async () => await pDelay(1), {
    timeout: 1000,
    logAll: true,
  })
})

async function myFunction(): Promise<void> {
  await pRetry(async () => await pDelay(1000), {
    timeout: 10,
    maxAttempts: 2,
    delay: 5,
    logAll: true,
  })
}

test('pRetry should time out and keep stack', async () => {
  const err = await pExpectedError(myFunction())
  // console.log(err.stack)

  expect(err).toMatchInlineSnapshot(`[TimeoutError: "pRetry function" timed out after 10 ms]`)
  expect(err).toBeInstanceOf(TimeoutError)

  expect(err.stack).toContain('TimeoutError')
  expect(err.stack).toContain('at myFunction')
  const stackLines = normalizeStack(err.stack!)
    .split('\n')
    .filter(
      line =>
        !line.includes('processTicks') &&
        !line.includes('Object.worker') &&
        !line.includes('node:internal'),
    )

  expect(stackLines.join('\n')).toMatchInlineSnapshot(`
    "TimeoutError: "pRetry function" timed out after 10 ms
        at pRetry pRetry.ts
        at myFunction pRetry.test.ts
        at new Promise (<anonymous>)"
  `)
})

test('should preserve this', async () => {
  class C {
    async helloWithRetry(): Promise<number> {
      return await pRetry(async () => {
        return this.hello()
      })
    }

    hello(): number {
      return this.getNumber() * 2
    }

    getNumber(): number {
      return 5
    }
  }

  const c = new C()
  const r = await c.helloWithRetry()
  expect(r).toBe(10)
})
