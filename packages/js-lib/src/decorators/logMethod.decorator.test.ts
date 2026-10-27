import { expect, it } from 'vitest'
import { pDelay } from '../promise/index.js'
import type { InstanceId } from '../types.js'
import { _LogMethod } from './logMethod.decorator.js'

class C {
  @_LogMethod()
  syncMethodSuccess(): string {
    return 'a'
  }

  @_LogMethod()
  syncMethodThrow(): never {
    throw new Error('MyError')
  }

  @_LogMethod()
  async asyncMethodSuccess(): Promise<string> {
    await pDelay(10)
    return 'a'
  }

  @_LogMethod()
  async asyncMethodThrow(): Promise<never> {
    await pDelay(10)
    throw new Error('MyError')
  }

  @_LogMethod({ avg: 3, logArgs: false, logStart: true, logResult: true })
  async asyncMethodSuccessAvg(delay: number): Promise<string> {
    await pDelay(delay)
    return 'a'
  }

  @_LogMethod({ logResultFn: r => [`my custom msg ${r}`] })
  methodResultFn(n: number): number {
    return n * 2
  }

  @_LogMethod()
  methodLongArg(..._args: any[]): string {
    return 'a'
  }

  @_LogMethod()
  methodReturnsArray(): number[] {
    return [1, 2, 3]
  }
}

const c = new C()

it('should return the result of a sync method', () => {
  const r = c.syncMethodSuccess()
  expect(r).toBe('a')
})

it('should run an async method with avg, logStart and logResult options without throwing', async () => {
  // Repeating to test count, avg, logResult, noLogStart, noLogArgs
  await c.asyncMethodSuccessAvg(1)
  await c.asyncMethodSuccessAvg(10)
  await c.asyncMethodSuccessAvg(20)
  await c.asyncMethodSuccessAvg(30)
})

it('should rethrow the error of a sync method', () => {
  expect(() => c.syncMethodThrow()).toThrow('MyError')
})

it('should return the result of an async method', async () => {
  const r = await c.asyncMethodSuccess()
  expect(r).toBe('a')
})

it('should reject with the error of an async method', async () => {
  await expect(c.asyncMethodThrow()).rejects.toThrow('MyError')
})

it('should run a method with logResultFn without throwing', () => {
  // Manual test to inspect console.log results
  c.methodResultFn(1)
  c.methodResultFn(2)
  c.methodResultFn(3)
})

it('should run a method with long args without throwing', () => {
  c.methodLongArg(5, 3, { a: 'a' }, { long: 'short' })
  c.methodLongArg(5, 3, { a: 'a' }, { long: 'longer longer value here' })
  c.methodLongArg([1, 2, 3])
  c.methodLongArg([1, 2, 3, 'long long looooooooooooooong'])
})

it('should run a method returning an array without throwing', () => {
  c.methodReturnsArray()
  c.methodReturnsArray()
  c.methodReturnsArray()
})

it('should run a method on an instance with an instanceId without throwing', () => {
  const c = new C() as C & InstanceId
  c.instanceId = 'instance_1'
  c.syncMethodSuccess()
})
