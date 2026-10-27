import type { BackendErrorResponseObject } from '@naturalcycles/js-lib/error'
import { afterAll, expect, it } from 'vitest'
import { debugResource } from '../test/debug.resource.js'
import { expressTestService } from '../testing/index.js'

const app = await expressTestService.createAppFromResource(debugResource)

afterAll(async () => {
  await app.close()
})

it('should respond with ok on the root path', async () => {
  const r = await app.get('')
  expect(r).toEqual({ ok: 1 })
})

it('should respond with the status and message of an error thrown by an async handler', async () => {
  const res = await app.doFetch<BackendErrorResponseObject>({
    url: 'asyncError',
    throwHttpErrors: false,
  })

  expect(res.statusCode).toBe(501)
  expect(res.body!.error.message).toBe('debug_async_error')
})
