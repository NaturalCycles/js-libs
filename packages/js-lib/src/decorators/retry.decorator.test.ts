import { expect, it } from 'vitest'
import { pDelay } from '../promise/index.js'
import { _Retry } from './retry.decorator.js'

class C {
  constructor(public succeedOnAttempt: number) {}

  attempt = 0

  @_Retry({
    maxAttempts: 3,
    delay: 100,
    delayMultiplier: 1,
    logAll: true,
  })
  async fn(...args: any[]): Promise<any> {
    this.attempt++
    // console.log(`fn called attempt=${attempt}`, {args})
    if (this.attempt >= this.succeedOnAttempt) {
      return args
    }

    throw new Error('fail')
  }
}

it('should retry until an attempt succeeds and return its result', async () => {
  const inst = new C(3)
  const r = await inst.fn(1, 2, 3)
  // console.log(r)
  expect(r).toEqual([1, 2, 3])
})

class A {
  @_Retry()
  async ok(): Promise<any> {
    return 'ok'
  }

  tries1 = 0

  @_Retry({
    delay: 20,
  })
  async error1time(): Promise<any> {
    this.tries1++
    await pDelay(10)
    if (this.tries1 <= 1) throw new Error('custom_error')
    return 'ok'
  }

  tries2 = 0

  @_Retry({ delay: 20, maxAttempts: 2, logAll: true })
  async error2times(): Promise<any> {
    this.tries2++
    await pDelay(10)
    if (this.tries2 <= 2) throw new Error('custom_error')
    return 'ok'
  }

  @_Retry({
    delay: 20,
    maxAttempts: 3,
  })
  async error2timesRetryTwice(): Promise<any> {
    this.tries2++
    await pDelay(10)
    if (this.tries2 <= 2) throw new Error('custom_error')
    return 'ok'
  }
}

it('should resolve with the result when the method succeeds on the first attempt', async () => {
  const a = new A()
  expect(await a.ok()).toBe('ok')
})

it('should resolve with the result on the second attempt when the method fails once', async () => {
  const a = new A()
  expect(await a.error1time()).toBe('ok')
  expect(a.tries1).toBe(2)
})

it('should reject when every attempt fails', async () => {
  const a = new A()
  await expect(a.error2times()).rejects.toThrow('custom_error')
})

it('should resolve with the result when the method succeeds on the last of three attempts', async () => {
  const a = new A()
  expect(await a.error2timesRetryTwice()).toBe('ok')
  expect(a.tries2).toBe(3)
})
