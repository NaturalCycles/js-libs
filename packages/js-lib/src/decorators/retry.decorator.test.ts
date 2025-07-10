import { expect, test } from 'vitest'
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

test('@Retry', async () => {
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

  private tries1 = 0

  @_Retry({
    delay: 20,
  })
  async error1time(): Promise<any> {
    this.tries1++
    await pDelay(10)
    if (this.tries1 <= 1) throw new Error('custom_error')
    return 'ok'
  }

  private tries2 = 0

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

test('ok', async () => {
  const a = new A()
  await a.ok()
})

test('error1time', async () => {
  const a = new A()
  await a.error1time()
})

test('error2times retry once should throw', async () => {
  const a = new A()
  await expect(a.error2times()).rejects.toThrow('custom_error')
})

test('error2times retry twice', async () => {
  const a = new A()
  await a.error2timesRetryTwice()
})
