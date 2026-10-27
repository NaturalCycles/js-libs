import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { commonLoggerNoop } from '../log/commonLogger.js'
import type { CommonLogFunction, CommonLogger } from '../log/commonLogger.js'
import { pDelay } from '../promise/index.js'
import type { InstanceId } from '../types.js'
import { _LogMethod } from './logMethod.decorator.js'

const log = vi.fn<CommonLogFunction>()
const logger: CommonLogger = { ...commonLoggerNoop, log }

class C {
  @_LogMethod({ logger })
  syncMethodSuccess(): string {
    return 'a'
  }

  @_LogMethod({ logger })
  syncMethodThrow(): never {
    throw new Error('MyError')
  }

  @_LogMethod({ logger })
  async asyncMethodSuccess(): Promise<string> {
    await pDelay(10)
    return 'a'
  }

  @_LogMethod({ logger })
  async asyncMethodThrow(): Promise<never> {
    await pDelay(10)
    throw new Error('MyError')
  }

  @_LogMethod({ logger, avg: 3, logArgs: false, logStart: true, logResult: true })
  async asyncMethodSuccessAvg(delay: number): Promise<string> {
    await pDelay(delay)
    return 'a'
  }

  @_LogMethod({ logger, logResultFn: r => [`my custom msg ${r}`] })
  methodResultFn(n: number): number {
    return n * 2
  }

  @_LogMethod({ logger })
  methodLongArg(..._args: any[]): string {
    return 'a'
  }

  @_LogMethod({ logger })
  methodReturnsArray(): number[] {
    return [1, 2, 3]
  }
}

const c = new C()

beforeEach(() => {
  vi.useFakeTimers()
  log.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

it('should log the call and return the result of a sync method', () => {
  const r = c.syncMethodSuccess()
  expect(r).toBe('a')
  expect(log).toHaveBeenCalledExactlyOnceWith('<< C.syncMethodSuccess() #1 took 0 ms')
})

it('should log the start, the result and the moving average of an async method', async () => {
  // Repeating to test count, avg, logResult, logStart, noLogArgs
  await callAndAdvance(c.asyncMethodSuccessAvg(1), 1)
  await callAndAdvance(c.asyncMethodSuccessAvg(10), 10)
  await callAndAdvance(c.asyncMethodSuccessAvg(20), 20)
  await callAndAdvance(c.asyncMethodSuccessAvg(30), 30)

  expect(log.mock.calls).toEqual([
    ['>> C.asyncMethodSuccessAvg() #1'],
    ['<< C.asyncMethodSuccessAvg() #1 took 1 ms (avg 1 ms) result: a'],
    ['>> C.asyncMethodSuccessAvg() #2'],
    ['<< C.asyncMethodSuccessAvg() #2 took 10 ms (avg 6 ms) result: a'],
    ['>> C.asyncMethodSuccessAvg() #3'],
    ['<< C.asyncMethodSuccessAvg() #3 took 20 ms (avg 10 ms) result: a'],
    ['>> C.asyncMethodSuccessAvg() #4'],
    ['<< C.asyncMethodSuccessAvg() #4 took 30 ms (avg 20 ms) result: a'],
  ])
})

it('should log and rethrow the error of a sync method', () => {
  expect(() => c.syncMethodThrow()).toThrow('MyError')
  expect(log).toHaveBeenCalledExactlyOnceWith({
    msg: '<< C.syncMethodThrow() #1 took 0 ms ERROR:',
    err: expect.objectContaining({ message: 'MyError' }),
  })
})

it('should log the call and return the result of an async method', async () => {
  const r = await callAndAdvance(c.asyncMethodSuccess(), 10)
  expect(r).toBe('a')
  expect(log).toHaveBeenCalledExactlyOnceWith('<< C.asyncMethodSuccess() #1 took 10 ms')
})

it('should log and reject with the error of an async method', async () => {
  const assertion = expect(c.asyncMethodThrow()).rejects.toThrow('MyError')
  await vi.advanceTimersByTimeAsync(10)
  await assertion
  expect(log).toHaveBeenCalledExactlyOnceWith({
    msg: '<< C.asyncMethodThrow() #1 took 10 ms ERROR:',
    err: expect.objectContaining({ message: 'MyError' }),
  })
})

it('should log the result through logResultFn', () => {
  c.methodResultFn(1)
  c.methodResultFn(2)
  c.methodResultFn(3)

  expect(log.mock.calls).toEqual([
    ['<< C.methodResultFn(1) #1 took 0 ms my custom msg 2'],
    ['<< C.methodResultFn(2) #2 took 0 ms my custom msg 4'],
    ['<< C.methodResultFn(3) #3 took 0 ms my custom msg 6'],
  ])
})

it('should log the args, replacing an arg longer than 30 chars with ...', () => {
  c.methodLongArg(5, 3, { a: 'a' }, { long: 'short' })
  c.methodLongArg(5, 3, { a: 'a' }, { long: 'longer longer value here' })
  c.methodLongArg([1, 2, 3])
  c.methodLongArg([1, 2, 3, 'long long looooooooooooooong'])

  expect(log.mock.calls).toEqual([
    ['<< C.methodLongArg(5, 3, {"a":"a"}, {"long":"short"}) #1 took 0 ms'],
    ['<< C.methodLongArg(5, 3, {"a":"a"}, ...) #2 took 0 ms'],
    ['<< C.methodLongArg([1,2,3]) #3 took 0 ms'],
    ['<< C.methodLongArg(...) #4 took 0 ms'],
  ])
})

it('should log the length of an array result', () => {
  c.methodReturnsArray()
  expect(log).toHaveBeenCalledExactlyOnceWith(
    '<< C.methodReturnsArray() #1 took 0 ms result: 3 items',
  )
})

it('should log the instanceId in the method signature', () => {
  const c = new C() as C & InstanceId
  c.instanceId = 'instance_1'
  c.syncMethodSuccess()
  expect(log).toHaveBeenCalledExactlyOnceWith(
    expect.stringMatching(/^<< C#instance_1\.syncMethodSuccess\(\) #\d+ took 0 ms$/),
  )
})

async function callAndAdvance<T>(promise: Promise<T>, millis: number): Promise<T> {
  await vi.advanceTimersByTimeAsync(millis)
  return await promise
}
