import { mockAllKindsOfThings } from '@naturalcycles/dev-lib/testing'
import { inspectStringifyFn } from '@naturalcycles/nodejs-lib'
import { expect, test } from 'vitest'
import type { BackendErrorResponseObject } from '../error/error.model.js'
import { _errorLikeToErrorObject, AppError } from '../error/error.util.js'
import { pExpectedError } from '../error/try.js'
import { expectResults } from '../test/test.util.js'
import { _stringify, setGlobalStringifyFunction } from './stringify.js'

test('stringify default', () => {
  expectResults(v => _stringify(v), mockAllKindsOfThings()).toMatchSnapshot()

  expectResults(
    v =>
      _stringify(v, {
        includeErrorData: true,
      }),
    mockAllKindsOfThings(),
  ).toMatchSnapshot()
})

test('appError', () => {
  const err = new AppError('la la', {
    backendResponseStatusCode: 409,
    userFriendly: true,
    other: 'otherValue',
  })

  expect(_stringify(err)).toMatchInlineSnapshot(`"AppError: la la"`)

  expect(_stringify(err, { includeErrorData: true })).toMatchInlineSnapshot(`
    "AppError: la la
    {
      "backendResponseStatusCode": 409,
      "userFriendly": true,
      "other": "otherValue"
    }"
  `)
})

test('appError with status 0', () => {
  const err = new AppError('la la', {
    backendResponseStatusCode: 0,
    userFriendly: true,
    other: 'otherValue',
  })

  expect(_stringify(err)).toMatchInlineSnapshot(`"AppError: la la"`)
})

test('backendErrorResponse', () => {
  const err = new AppError('la la\nsecond line', {
    backendResponseStatusCode: 409,
    userFriendly: true,
    other: 'otherValue',
  })

  const resp: BackendErrorResponseObject = {
    error: _errorLikeToErrorObject(err),
  }
  expect(resp.error.name).toBe('AppError')

  expect(_stringify(resp)).toMatchInlineSnapshot(`
    "AppError: la la
    second line"
  `)

  // this tests "duplicated line" bug
  // expect(_stringifyAny(resp, { includeErrorStack: true })).toMatchInlineSnapshot()
})

test('error with cause', () => {
  const err = new Error('err1', {
    cause: new AppError(
      'http_error1',
      {
        backendResponseStatusCode: 400,
      },
      {
        cause: {
          name: 'SomeError',
          message: 'sub-cause',
          data: {},
        },
      },
    ),
  })

  expect(_stringify(err)).toMatchInlineSnapshot(`
    "Error: err1
    Caused by: AppError: http_error1
    Caused by: SomeError: sub-cause"
  `)
})

test('AggregateError', async () => {
  const err = await pExpectedError(
    Promise.any([
      new Promise((_, reject) => reject(new Error('err1'))),
      new Promise((_, reject) => reject(new Error('err2'))),
    ]),
    AggregateError,
  )

  expect(_stringify(err)).toMatchInlineSnapshot(`
    "AggregateError: All promises were rejected
    2 error(s):
    1. Error: err1
    2. Error: err2"
  `)
})

const obj = {
  a: 'a',
  b: { c: 'c' },
}

test('simple object', () => {
  expect(_stringify(obj)).toMatchInlineSnapshot(`
    "{
      "a": "a",
      "b": {
        "c": "c"
      }
    }"
  `)
})

test('setGlobalStringifyFunction', () => {
  setGlobalStringifyFunction(inspectStringifyFn)

  expect(_stringify(obj)).toMatchInlineSnapshot(`"{ a: 'a', b: { c: 'c' } }"`)

  expect(_stringify(new Map([['a', 'b']]))).toMatchInlineSnapshot(`"{ a: 'b' }"`)
})
