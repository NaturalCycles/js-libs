import { expect, expectTypeOf, it } from 'vitest'
import { AppError } from '../error/error.util.js'
import { pExpectedError } from '../error/try.js'
import { normalizeStack } from '../test/test.util.js'
import { pDefer } from './pDefer.js'
import { pDelay } from './pDelay.js'
import { pProps } from './pProps.js'

it('should resolve promises, deferreds, plain values and nested promises', async () => {
  const defer = pDefer<number>()

  const input = {
    foo: pDelay(100).then(() => 1),
    bar: Promise.resolve(2),
    bar2: defer,
    faz: 3,
    inception: Promise.resolve(Promise.resolve(4)),
  }

  setTimeout(() => defer.resolve(123), 0)

  const r = await pProps(input)
  expect(r).toEqual({
    foo: 1,
    bar: 2,
    bar2: 123,
    faz: 3,
    inception: 4,
  })
})

it('should reject if any input promise rejects', async () => {
  await expect(
    pProps({
      foo: Promise.resolve(1),
      bar: Promise.reject(new Error('bar')),
    }),
  ).rejects.toThrow('bar')
})

it('should return an empty object for an empty input', async () => {
  expect(await pProps({})).toEqual({})
})

// Good stack should look like this:
// AppError: failing msg
//     at failingFn (pProps.test.ts:62:9)
//     at wrappingFn (pProps.test.ts:52:3)
//     at pExpectedError (try.ts:81:5)
//     at Object.<anonymous> (pProps.test.ts:44:15)
it('should preserve stack', async () => {
  const err = await pExpectedError(wrappingFn())

  // console.log(err)
  // console.log(normalizeStack(err.stack!))
  // console.log(err.stack)
  // expect(err.stack).toContain('at failingFn')
  // expect(err.stack).toContain('at wrappingFn')
  // expect(err.stack).toContain('at pExpectedError')

  expect(normalizeStack(err.stack!)).toMatchInlineSnapshot(`
    "AppError: failing msg
        at failingFn pProps.test.ts
        at async Promise.all (index 1)
        at pProps pProps.ts
        at wrappingFn pProps.test.ts
        at pExpectedError try.ts"
  `)
})

it('should infer the resolved value types', async () => {
  const r = await pProps({
    a: pDelay(0, 'a'),
    b: pDelay(0, 42),
    c: 'cc',
    d: pDelay(0, pDelay(0, { obj: { a: 'aa' } })),
  })

  expectTypeOf(r).toEqualTypeOf({
    a: 'a',
    b: 42,
    c: 'cc',
    d: { obj: { a: 'aa' } },
  })
})

async function wrappingFn(): Promise<{ n1: number; n2: number }> {
  // await failingFn()

  return await pProps({
    n1: successFn(),
    n2: failingFn(),
  })
}

async function failingFn(): Promise<number> {
  await pDelay(10)
  throw new AppError('failing msg')
}

async function successFn(): Promise<number> {
  await pDelay(1)
  return 15
}
