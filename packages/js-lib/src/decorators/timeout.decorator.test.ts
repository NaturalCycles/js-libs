import { expect, it } from 'vitest'
import { TimeoutError } from '../error/error.util.js'
import { pExpectedError } from '../error/try.js'
import { pDelay } from '../promise/pDelay.js'
import { _Timeout } from './timeout.decorator.js'

class C {
  constructor(public succeedOnAttempt: number) {}

  @_Timeout({
    timeout: 50,
  })
  async fn(delay: number, value?: any): Promise<any> {
    return await pDelay(delay, value)
  }
}

it('should resolve within the timeout and reject with a TimeoutError after it', async () => {
  const c = new C(3)

  expect(await c.fn(10, 'hej')).toBe('hej')

  const err = await pExpectedError(c.fn(100))
  expect(err).toMatchInlineSnapshot(`[TimeoutError: "C.fn" timed out after 50 ms]`)
  expect(err).toBeInstanceOf(TimeoutError)
})
