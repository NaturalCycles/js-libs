import { mockTime } from '@naturalcycles/dev-lib/testing/time'
import { beforeEach, expect, test, vi } from 'vitest'
import { pDelay } from '../promise/index.js'
import { _createPromiseDecorator } from './createPromiseDecorator.js'

interface LoaderDecoratorParams {
  type: string
}

const beforeFn = vi.fn()
const thenFn = vi.fn(r => r.res)
const catchFn = vi.fn()
const finallyFn = vi.fn()

// eslint-disable-next-line @typescript-eslint/naming-convention
const DummyDecorator = (): MethodDecorator =>
  _createPromiseDecorator({
    decoratorName: 'Dummy',
  })

// eslint-disable-next-line @typescript-eslint/naming-convention
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

  @DummyDecorator()
  async dummy(): Promise<number> {
    return 4
  }

  // Cannot use _createPromiseDecorator on sync methods!
  // @DummyDecorator()
  // dummySync(): number {
  //   return 4
  // }
}

const c = new C()

beforeEach(() => {
  mockTime()
})

test('_createPromiseDecorator', async () => {
  const r = await c.run(2)
  expect(r).toBe(4)

  expect(thenFn).toMatchSnapshot()

  expect(await c.dummy()).toBe(4)
})

// todo: cover more cases
