import { inspect } from 'node:util'
import { expect, test, vi } from 'vitest'
import { _stringify } from '../string/stringify.js'
import { _anyToErrorObject, AppError } from './error.util.js'

const throwAppError = (): never => {
  throw new AppError('error')
}
const throwAppErrorAsync = async (): Promise<never> => {
  throw new AppError('error')
}

test('appError properties should be present', async () => {
  // Error.captureStackTrace = false as any
  const r = new AppError('hello')
  // console.log(r.message, r.name, r.stack)
  expect(r.message).toBe('hello')
  expect(r.name).toBe('AppError')
  expect(r.constructor.name).toBe('AppError')
  expect(r.stack).toBeDefined()

  const data = { a: 'b' }
  const r2 = new AppError('hello', data)
  expect(r2.data).toEqual(data)

  expect(throwAppError).toThrow(AppError)
  await expect(throwAppErrorAsync()).rejects.toThrow(AppError)
})

test('appError should work when Error.captureStacktrace is n/a', () => {
  vi.spyOn(Error, 'captureStackTrace').mockReturnValue(undefined)
  const r = new AppError('hello')
  // console.log(r.message, r.name, r.stack)
  expect(r.message).toBe('hello')
  expect(r.name).toBe('AppError')
  expect(r.stack).toBeDefined()
})

test('AppError log should NOT include constructor and data', () => {
  const err = new AppError('hello')
  // console.log(err)

  expect(err.name).toBe('AppError')
  expect(err.constructor.name).toBe('AppError')
  expect(err.constructor).toBe(AppError)
  const s = filterStackTrace(inspect(err))
  // console.log(s)

  expect(s).not.toContain('constructor')
  expect(s).not.toContain('data')

  // Should allow writing to this property
  err.data = {}
})

test('AppError with cause', () => {
  const err1 = new AppError('cozz')
  const err = new AppError('hello', {}, { cause: err1 })
  expect(err.cause!.stack).toBeDefined()
  delete err.cause!.stack
  expect(err.cause).toMatchInlineSnapshot(`
    {
      "data": {},
      "message": "cozz",
      "name": "AppError",
    }
  `)
  expect(_stringify(_anyToErrorObject(err.cause))).toBe(_stringify(_anyToErrorObject(err1)))
})

function filterStackTrace(s: string): string {
  return s
    .split('\n')
    .filter(line => !line.trimStart().startsWith('at '))
    .join('\n')
}

class MinifiedError extends AppError {
  constructor() {
    super('yo', {}, { name: 'ProperError' })
  }
}

Object.defineProperty(MinifiedError.constructor, 'name', {
  writable: true,
})
;(MinifiedError.constructor as any).name = 'Weird'

test('minified error name', () => {
  expect(MinifiedError.constructor.name).toBe('Weird')

  const err = new MinifiedError()
  expect(err.name).toBe('ProperError')
  expect(err.constructor.name).toBe('ProperError')
})
