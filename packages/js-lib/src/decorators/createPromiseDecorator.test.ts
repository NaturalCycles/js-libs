import { MOCK_TS_2018_06_21 } from '@naturalcycles/dev-lib/testing/time'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { pDefer, pDelay } from '../promise/index.js'
import { _createPromiseDecorator } from './createPromiseDecorator.js'
import type { PromiseDecoratorResp } from './createPromiseDecorator.js'

interface LoaderDecoratorParams {
  type: string
}

const beforeFn = vi.fn<() => void>()
const thenFn = vi.fn<(r: any) => any>(r => r.res)
const catchFn = vi.fn<(r: any) => any>()
const finallyFn = vi.fn<() => void>()

const DummyDecorator = (): MethodDecorator =>
  _createPromiseDecorator({
    decoratorName: 'Dummy',
  })

const Loader = (params: LoaderDecoratorParams): MethodDecorator =>
  _createPromiseDecorator(
    {
      decoratorName: 'Loader',
      beforeFn,
      thenFn,
      catchFn,
      finallyFn,
    },
    params,
  )

class C {
  @Loader({ type: 'MY_TYPE' })
  async run(a: number): Promise<number> {
    return await pDelay(10, a * 2)
  }

  @Loader({ type: 'MY_TYPE' })
  async fail(): Promise<number> {
    throw new Error('boom')
  }

  @DummyDecorator()
  async dummy(): Promise<number> {
    return 4
  }

  @DummyDecorator()
  async dummyFail(): Promise<number> {
    throw new Error('boom')
  }

  // Cannot use _createPromiseDecorator on sync methods!
  // @DummyDecorator()
  // dummySync(): number {
  //   return 4
  // }
}

const c = new C()

beforeEach(() => {
  vi.setSystemTime(MOCK_TS_2018_06_21 * 1000)
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

it('should pass the call context to beforeFn, thenFn and finallyFn and resolve with the result', async () => {
  const r = await c.run(2)
  expect(r).toBe(4)

  const resp = callContext('run', [2])
  expect(beforeFn).toHaveBeenCalledExactlyOnceWith(resp)
  expect(thenFn).toHaveBeenCalledExactlyOnceWith({ ...resp, res: 4 })
  expect(finallyFn).toHaveBeenCalledExactlyOnceWith(resp)
  expect(catchFn).not.toHaveBeenCalled()
})

it('should pass the error to catchFn, call finallyFn and not rethrow when catchFn is set', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})

  await c.fail()

  const resp = callContext('fail', [])
  expect(catchFn).toHaveBeenCalledExactlyOnceWith({
    ...resp,
    err: expect.objectContaining({ message: 'boom' }),
  })
  expect(finallyFn).toHaveBeenCalledExactlyOnceWith(resp)
  expect(thenFn).not.toHaveBeenCalled()
})

it('should resolve with the value returned by catchFn', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  catchFn.mockReturnValueOnce(-1)

  expect(await c.fail()).toBe(-1)
})

it('should await an async catchFn before calling finallyFn and resolve with its value', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const catchFnCalled = pDefer()
  const fallback = pDefer<number>()
  catchFn.mockImplementationOnce(() => {
    catchFnCalled.resolve()
    return fallback
  })

  const result = c.fail()
  await catchFnCalled

  expect(finallyFn).not.toHaveBeenCalled()

  fallback.resolve(-1)

  expect(await result).toBe(-1)
  expect(finallyFn).toHaveBeenCalledExactlyOnceWith(callContext('fail', []))
})

it.each([
  [
    'throws',
    () => {
      throw new Error('rethrown')
    },
  ],
  [
    'rejects',
    async () => {
      throw new Error('rethrown')
    },
  ],
])(
  'should reject with the error and still call finallyFn when catchFn %s',
  async (_, implementation) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    catchFn.mockImplementationOnce(implementation)

    await expect(c.fail()).rejects.toThrow('rethrown')
    expect(finallyFn).toHaveBeenCalledExactlyOnceWith(callContext('fail', []))
  },
)

it('should resolve with the result of a decorator without hooks', async () => {
  expect(await c.dummy()).toBe(4)
})

it('should rethrow the error when catchFn is not set', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})

  await expect(c.dummyFail()).rejects.toThrow('boom')
})

// todo: cover more cases

function callContext(key: string, args: any[]): PromiseDecoratorResp<LoaderDecoratorParams> {
  return {
    decoratorParams: { type: 'MY_TYPE' },
    args,
    key,
    target: C.prototype,
    decoratorName: 'Loader',
    started: MOCK_TS_2018_06_21 * 1000,
  }
}
