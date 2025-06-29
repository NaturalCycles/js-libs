import type { StringMap } from '@naturalcycles/js-lib'
import { z } from '@naturalcycles/js-lib/zod'
import { _inspect } from '@naturalcycles/nodejs-lib'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { debugResource } from '../../test/debug.resource.js'
import type { ExpressApp } from '../../testing/index.js'
import { expressTestService } from '../../testing/index.js'
import { getDefaultRouter } from '../getDefaultRouter.js'
import { zodValidateRequest } from './zodValidateRequest.js'

const app = await expressTestService.createAppFromResource(debugResource)

afterAll(async () => {
  await app.close()
})

test('zodValidateRequest', async () => {
  // should pass (no error)
  await app.put('changePasswordZod', {
    json: {
      pw: 'longEnough',
    },
  })

  const pw = 'short'
  const err = await app.expectError({
    url: 'changePasswordZod',
    method: 'PUT',
    json: {
      pw,
    },
  })
  expect(err.data.responseStatusCode).toBe(400)
  expect(err.cause.message).not.toContain(pw)
  expect(err.cause.message).toContain('REDACTED')
  expect(err.cause).toMatchInlineSnapshot(`
    {
      "data": {
        "backendResponseStatusCode": 400,
      },
      "message": "Invalid Object

    Input:
    {
      "pw": "REDACTED"
    }

    pw: Too small: expected string to have >=8 characters",
      "name": "AppError",
    }
  `)

  expect(_inspect(err.cause)).toMatchInlineSnapshot(`
    "AppError: Invalid Object

    Input:
    {
      "pw": "REDACTED"
    }

    pw: Too small: expected string to have >=8 characters"
  `)
})

describe('zodValidateRequest.headers', () => {
  let app: ExpressApp
  interface TestResponse {
    ok: 1
    headers: StringMap<any>
  }

  beforeAll(async () => {
    const resource = getDefaultRouter()
    resource.get('/', async (req, res) => {
      zodValidateRequest.headers(
        req,
        z.object({
          shortstring: z.string().min(8).max(16),
          numeric: z.string(),
          bool: z.string(),
          sessionid: z.string(),
        }),
        { redactPaths: ['sessionid'] },
      )

      res.json({ ok: 1, headers: req.headers })
    })
    app = await expressTestService.createAppFromResource(resource)
  })

  afterAll(async () => {
    await app.close()
  })

  test('should pass valid headers', async () => {
    const response = await app.get<TestResponse>('', {
      headers: {
        shortstring: 'shortstring',
        numeric: '123',
        bool: '1',
        sessionid: 'sessionid',
      },
    })

    expect(response).toMatchObject({ ok: 1 })
    expect(response.headers).toMatchObject({
      shortstring: 'shortstring',
      numeric: '123',
      bool: '1',
      sessionid: 'sessionid',
    })
  })

  test('should throw error on invalid headers', async () => {
    const err = await app.expectError({
      url: '',
      method: 'GET',
      headers: {
        shortstring: 'short',
        numeric: '123',
        bool: '1',
        sessionid: 'sessionid',
      },
    })

    expect(err.data.responseStatusCode).toBe(400)
    expect(err.cause.message).toContain(
      `shortstring: Too small: expected string to have >=8 characters`,
    )
  })

  test('should redact sensitive data', async () => {
    const err = await app.expectError({
      url: '',
      method: 'GET',
      headers: {
        shortstring: 'short',
        numeric: '127',
        bool: '1',
        sessionid: 'sessionid',
      },
    })

    expect(err.data.responseStatusCode).toBe(400)
    expect(err.cause.message).toContain('"REDACTED": "REDACTED"')
    expect(err.cause.message).not.toContain('sessionid')
  })

  test('should not replace the headers with the validated value by default', async () => {
    const response = await app.get<TestResponse>('', {
      headers: {
        shortstring: 'shortstring',
        numeric: '123',
        bool: '1',
        sessionid: 'sessionid',
        foo: 'bar',
      },
    })

    expect(response.headers).toMatchObject({
      shortstring: 'shortstring',
      numeric: '123',
      bool: '1',
      sessionid: 'sessionid',
      foo: 'bar',
    })
  })

  test('should replace the headers with the validated value when configured so', async () => {
    const resource = getDefaultRouter().get('/', async (req, res) => {
      zodValidateRequest.headers(
        req,
        z.object({
          shortstring: z.string().min(8).max(16),
          numeric: z.string(),
        }),
        { keepOriginal: false },
      )

      res.json({ ok: 1, headers: req.headers })
    })
    const app = await expressTestService.createAppFromResource(resource)

    const response = await app.get<TestResponse>('', {
      headers: {
        shortstring: 'shortstring',
        numeric: '123',
        foo: 'bar',
      },
    })

    expect(response.headers).toEqual({
      shortstring: 'shortstring',
      numeric: '123', // NOT converted to number
      // foo: 'bar' // fields not in the schema are removed
    })

    await app.close()
  })
})
