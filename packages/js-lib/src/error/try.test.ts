import { expect, expectTypeOf, it } from 'vitest'
import { _assert } from './assert.js'
import { AppError, HttpRequestError, UnexpectedPassError } from './error.util.js'
import { _expectedError, _try, pExpectedError, pExpectedErrorString, pTry } from './try.js'

const okFunction = (v = 1): { result: number } => ({ result: v })
const errFunction = (): never => {
  throw new AppError('oj')
}

it('should return [null, result] on success and [error, null] on throw', () => {
  const [err, res] = _try(() => okFunction())
  expectTypeOf(err).toEqualTypeOf<Error | null>()
  expectTypeOf(res).toEqualTypeOf<{ result: number } | null>()
  expect(err).toBeNull()
  expect(res).toEqual({ result: 1 })

  _assert(!err)
  expectTypeOf(err).toEqualTypeOf<null>()
  expectTypeOf(res).toEqualTypeOf<{ result: number }>()

  // On this line we're testing that `res` type is non-optional (by design)
  expect(res.result).toBe(1)

  expect(_try(okFunction)).toEqual([null, { result: 1 }])
  expect(_try(() => okFunction(3))).toEqual([null, { result: 3 }])

  const [err2, v] = _try(errFunction)
  expect(err2).toMatchInlineSnapshot(`[AppError: oj]`)
  expect(v).toBeNull()
})

const createOkPromise = async (v = 1): Promise<{ result: number }> => ({ result: v })
const createErrorPromise = async (): Promise<never> => {
  throw new AppError('oj')
}

it('should resolve to [null, result] or [error, null], rethrowing errors of another class', async () => {
  const [err, res] = await pTry(createOkPromise())
  expectTypeOf(err).toEqualTypeOf<Error | null>()
  expectTypeOf(res).toEqualTypeOf<{ result: number } | null>()

  expect(err).toBeNull()
  expect(res).toEqual({ result: 1 })

  _assert(!err)
  expectTypeOf(err).toEqualTypeOf<null>()
  expectTypeOf(res).toEqualTypeOf<{ result: number }>()

  // On this line we're testing that `res` type is non-optional (by design)
  expect(res.result).toBe(1)

  const [err2, res2] = await pTry(createErrorPromise())
  expect(err2).toMatchInlineSnapshot(`[AppError: oj]`)
  expect(res2).toBeNull()

  _assert(err2)
  // console.log(err2!.stack)
  // Test that "async-stacktraces" are preserved and it shows the originating function name
  expect(err2.stack?.includes('at createErrorPromise')).toBe(true)

  // pTry with errorClass
  const [err3, res3] = await pTry(createErrorPromise(), AppError)
  expectTypeOf(err3).toEqualTypeOf<AppError<any> | null>()

  _assert(err3)
  expectTypeOf(err3).toEqualTypeOf<AppError<any>>()
  expect(err3).toBeInstanceOf(AppError)
  expect(res3).toBeNull()

  // pTry to rethrow on mismatched errorType
  const err4 = await pExpectedErrorString(pTry(createErrorPromise(), HttpRequestError))
  expect(err4).toMatchInlineSnapshot(`"AppError: oj"`)
})

it('should return the thrown error, throwing UnexpectedPassError when nothing is thrown', () => {
  const err = _expectedError(errFunction, AppError)
  expectTypeOf(err).toEqualTypeOf<AppError<any>>()
  expect(err).toMatchInlineSnapshot(`[AppError: oj]`)
  expect(err).toBeInstanceOf(AppError)

  const [err2] = _try(() => _expectedError(() => okFunction()))
  expect(err2).toBeInstanceOf(UnexpectedPassError)
  expect(err2!.message).toMatchInlineSnapshot(`"expected error was not thrown"`)
})

it('should resolve to the rejection error, rejecting on success or on another error class', async () => {
  const err = await pExpectedError<AppError>(createErrorPromise())
  expect(err).toMatchInlineSnapshot(`[AppError: oj]`)
  expect(err).toBeInstanceOf(AppError)

  const err1 = await pExpectedError(createErrorPromise(), AppError)
  expectTypeOf(err1).toEqualTypeOf<AppError<any>>()

  const [err2] = await pTry(pExpectedError(createOkPromise()))
  expect(err2).toBeInstanceOf(UnexpectedPassError)
  expect(err2!.message).toMatchInlineSnapshot(`"expected error was not thrown"`)

  const [err3] = await pTry(pExpectedError(createErrorPromise(), HttpRequestError))
  expect(err3!.message).toMatchInlineSnapshot(`"oj"`)
})
