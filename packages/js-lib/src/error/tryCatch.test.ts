import { expect, it, vi } from 'vitest'
import { _TryCatch, _tryCatch } from './tryCatch.js'

// oxlint-disable @typescript-eslint/await-thenable

const _fnSuccess = (...args: any[]): any => args

const _fnError = (): never => {
  throw new Error('fail')
}

it('should return the result on success, and call onError and return undefined on error', async () => {
  const fnSuccess = _tryCatch(_fnSuccess)
  let r = await fnSuccess(1, 2, 3)
  expect(r).toEqual([1, 2, 3])

  const onError = vi.fn<(err: Error) => void>()
  const fnError = _tryCatch(_fnError, {
    onError,
    logSuccess: true,
    logError: true,
  })

  r = await fnError()
  expect(r).toBeUndefined()
  expect(onError).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ message: 'fail' }))
})

const onDecoratedError = vi.fn<(err: Error) => void>()

class C {
  @_TryCatch()
  fnSuccess(...args: any[]): any {
    return args
  }

  @_TryCatch({
    onError: onDecoratedError,
    logSuccess: true,
    logError: true,
  })
  fnError(): never {
    throw new Error('fail')
  }
}

const c = new C()

it('should return the result on success, and call onError and return undefined on error for a decorated method', async () => {
  const r = await c.fnSuccess(1, 2, 3)
  expect(r).toEqual([1, 2, 3])

  const r2 = await c.fnError()
  expect(r2).toBeUndefined()
  expect(onDecoratedError).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ message: 'fail' }),
  )
})
