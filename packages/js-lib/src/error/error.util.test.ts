import { expect, test } from 'vitest'
import { _omit } from '../object/index.js'
import { expectResults } from '../test/test.util.js'
import {
  _anyToError,
  _anyToErrorObject,
  _isBackendErrorResponseObject,
  _isErrorObject,
} from './error.util.js'
import type { BackendErrorResponseObject, ErrorObject, HttpRequestErrorData } from './index.js'
import {
  _errorDataAppend,
  _errorLikeToErrorObject,
  _errorObjectToError,
  _errorSnippet,
  _isErrorLike,
  _isHttpRequestErrorObject,
  AppError,
  AssertionError,
  HttpRequestError,
} from './index.js'

const anyItems = [
  undefined,
  null,
  '',
  'hello a',
  0,
  1,
  -5,
  () => 'smth',
  {},
  [],
  ['a'],
  { a: 'aa' },
  new Error('err msg'),
  // plain objects, not a qualified ErrorObject
  { message: 'yada' },
  { message: 'yada', data: {} },
  { message: 'yada', data: { backendResponseStatusCode: 404 } },
  // qualified ErrorObjects:
  { name: 'Error', message: 'yada' } as ErrorObject,
  { name: 'Error', message: 'yada', data: {} } as ErrorObject,
  { name: 'Error', message: 'yada', data: { backendResponseStatusCode: 404 } } as ErrorObject,
  // Other
  new AppError('err msg'),
  new HttpRequestError(
    'http err msg',
    {
      backendResponseStatusCode: 400,
    } as HttpRequestErrorData,
    {
      cause: {
        name: 'AppError',
        message: 'Type error: la-la',
        data: {},
      },
    },
  ),
  {
    error: {
      name: 'HttpError',
      message: 'err msg',
      data: {
        backendResponseStatusCode: 400,
        a: 'b\nc',
      },
    },
  } as BackendErrorResponseObject,
]

test('anyToErrorObject', () => {
  // omitting stack only for snapshot determinism
  expectResults(v => _omit(_anyToErrorObject(v), ['stack']), anyItems).toMatchSnapshot()
})

test('anyToError', () => {
  expectResults(v => _anyToError(v), anyItems).toMatchSnapshot()

  const httpError = new AppError('la la', {
    backendResponseStatusCode: 400,
    userFriendly: true,
  })

  // Because httpError is instance of Error - it should return exactly same object
  const httpError2 = _anyToError(httpError)
  expect(httpError2).toBe(httpError)

  const httpErrorObject = _anyToErrorObject(httpError)
  expect(httpErrorObject).not.toBeInstanceOf(Error)
  expect(_omit(httpErrorObject, ['stack'])).toMatchInlineSnapshot(`
    {
      "data": {
        "backendResponseStatusCode": 400,
        "userFriendly": true,
      },
      "message": "la la",
      "name": "AppError",
    }
  `)

  // This is an "httpError", but packed in Error
  // With e.g name == 'HttpError'
  const httpError3 = _anyToError(httpErrorObject)
  expect(httpError3).toMatchInlineSnapshot('[AppError: la la]')
  expect(httpError3).toBeInstanceOf(Error)
  expect(httpError3).not.toBeInstanceOf(HttpRequestError)
  expect(httpError3.name).toBe(httpError.name)
  expect((httpError3 as HttpRequestError).data).toEqual(httpError.data)
  expect(httpError3.stack).toBe(httpError.stack) // should preserve the original stack, despite "re-packing"

  // This is a "proper" HttpRequestError
  const httpError4 = _anyToError(httpErrorObject, HttpRequestError)
  expect(httpError4).toMatchInlineSnapshot('[HttpRequestError: la la]')
  expect(httpError4).toBeInstanceOf(HttpRequestError)
  expect(httpError4.name).toBe(HttpRequestError.name)
  expect(httpError4.data).toEqual(httpError.data)
  // should preserve the original stack, despite "re-packing"
  expect(httpError4.stack).toBe(httpError.stack)
})

test('appErrorToErrorObject / errorObjectToAppError snapshot', () => {
  const data = { a: 'b' }
  const err1 = new AppError('hello', data)
  const err2 = _errorLikeToErrorObject(err1)
  // console.log(err2)

  expect(err2.name).toBe('AppError')
  expect(err2.message).toBe('hello')
  expect(err2).toMatchSnapshot({
    stack: expect.stringContaining('AppError'),
  })
})

test('isErrorObject', () => {
  expectResults(v => _isErrorObject(v), anyItems).toMatchSnapshot()
})

test('isErrorLike', () => {
  expectResults(v => _isErrorLike(v), anyItems).toMatchSnapshot()
})

test('isHttpRequestErrorObject', () => {
  expectResults(v => _isHttpRequestErrorObject(v), anyItems).toMatchSnapshot()
})

test('isHttpErrorResponse', () => {
  expectResults(v => _isBackendErrorResponseObject(v), anyItems).toMatchSnapshot()
})

test('_errorObjectToError should not repack if already same error', () => {
  const e = new AppError('yo', { backendResponseStatusCode: 400 })
  expect(_isErrorObject(e)).toBe(true)
  // HttpError not an ErrorObject, actually
  const e2 = _errorObjectToError(e as ErrorObject, AppError)
  expect(e2).toBe(e)
  const e3 = _anyToError(e)
  expect(e3).toBe(e)

  // errorClass is Error - still should NOT re-pack
  expect(_errorObjectToError(e as ErrorObject)).toBe(e)
  expect(_anyToError(e)).toBe(e)

  // But if errorClass is different - it SHOULD re-pack
  const e4 = _errorObjectToError(e as ErrorObject, AssertionError)
  expect(e4).not.toBe(e)
  expect(e4).toBeInstanceOf(AssertionError)
  expect(e4.name).toBe(AssertionError.name)
  expect(e4.data).toBe(e.data)
  expect(e4.stack).toBe(e.stack) // important to preserve the stack!
})

test('_errorDataAppend', () => {
  const err = new Error('yo') as any
  const err_ = _errorDataAppend(err, { backendResponseStatusCode: 401 })
  expect(err_).toBe(err) // same object
  expect(err).toMatchInlineSnapshot('[Error: yo]')
  expect(err.data).toMatchInlineSnapshot(`
    {
      "backendResponseStatusCode": 401,
    }
  `)

  const err2 = new AppError('yo', {
    code: 'A',
  })
  const err2Data = err2.data
  _errorDataAppend(err2, { backendResponseStatusCode: 401 })
  expect((err2 as any).data).toMatchInlineSnapshot(`
{
  "backendResponseStatusCode": 401,
  "code": "A",
}
`)
  // Should not re-assign err.data to a new object, should keep the same reference instead

  expect(err2.data === err2Data).toBe(true)

  _errorDataAppend(err2, { code: 'B' })
  expect((err2 as any).data).toMatchInlineSnapshot(`
{
  "backendResponseStatusCode": 401,
  "code": "B",
}
`)
})

test('_errorSnippet', () => {
  expectResults(v => _errorSnippet(v), anyItems).toMatchSnapshot()
})
