import { mockAllKindsOfThings } from '@naturalcycles/dev-lib/testing'
import { inspectStringifyFn } from '@naturalcycles/nodejs-lib'
import { afterAll, expect, it } from 'vitest'
import type { BackendErrorResponseObject } from '../error/error.model.js'
import { _errorLikeToErrorObject, AppError } from '../error/error.util.js'
import { pExpectedError } from '../error/try.js'
import { expectResults } from '../test/test.util.js'
import {
  _stringify,
  resetGlobalStringifyFunction,
  setGlobalStringifyFunction,
} from './stringify.js'

afterAll(() => {
  resetGlobalStringifyFunction()
})

it('should stringify all kinds of values, with and without error data', () => {
  expectResults(v => _stringify(v), mockAllKindsOfThings()).toMatchSnapshot()

  expectResults(
    v =>
      _stringify(v, {
        includeErrorData: true,
      }),
    mockAllKindsOfThings(),
  ).toMatchSnapshot()
})

it('should include the AppError data only with includeErrorData', () => {
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

it('should stringify an AppError with status code 0 as its message', () => {
  const err = new AppError('la la', {
    backendResponseStatusCode: 0,
    userFriendly: true,
    other: 'otherValue',
  })

  expect(_stringify(err)).toMatchInlineSnapshot(`"AppError: la la"`)
})

it('should stringify a backend error response as its multiline message', () => {
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

it('should append each cause of an error', () => {
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

it('should list the errors of an AggregateError', async () => {
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

it('should stringify an object as indented JSON', () => {
  expect(_stringify(obj)).toMatchInlineSnapshot(`
    "{
      "a": "a",
      "b": {
        "c": "c"
      }
    }"
  `)
})

it('should use the global stringify function once it is set', () => {
  setGlobalStringifyFunction(inspectStringifyFn)

  expect(_stringify(obj)).toMatchInlineSnapshot(`"{ a: 'a', b: { c: 'c' } }"`)

  expect(_stringify(new Map([['a', 'b']]))).toMatchInlineSnapshot(`"{ a: 'b' }"`)
})
