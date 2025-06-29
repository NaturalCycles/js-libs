import type { StringMap } from '@naturalcycles/js-lib'
import { jsonSchema } from '@naturalcycles/js-lib'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { debugResource } from '../../test/debug.resource.js'
import type { ExpressApp } from '../../testing/index.js'
import { expressTestService } from '../../testing/index.js'
import { getDefaultRouter } from '../getDefaultRouter.js'
import { validateHeaders } from './validateMiddleware.js'

const app = await expressTestService.createAppFromResource(debugResource)

afterAll(async () => {
  await app.close()
})

test('validateBody', async () => {
  // should pass (no error)
  await app.put('changePassword2', {
    json: {
      pw: 'longEnough',
    },
  })

  const pw = 'short'
  const err = await app.expectError({
    url: 'changePassword2',
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
        "errors": [],
        "objectName": "request body",
      },
      "message": "request body/pw must NOT have fewer than 8 characters
    Input: { pw: 'REDACTED' }",
      "name": "AppError",
    }
  `)
})

describe('validateHeader', () => {
  let app: ExpressApp
  interface TestResponse {
    ok: 1
    headers: StringMap<any>
  }

  beforeAll(async () => {
    const resource = getDefaultRouter()
    const schema = jsonSchema.object({
      shortstring: jsonSchema.string().min(8).max(16),
      numeric: jsonSchema.string(),
      bool: jsonSchema.string(),
      sessionid: jsonSchema.string(),
    })
    resource.get('/', validateHeaders(schema, { redactPaths: ['sessionid'] }), async (req, res) => {
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
    expect(response.headers).toEqual({
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
      'request headers/shortstring must NOT have fewer than 8 characters',
    )
  })

  test('should list all errors (and not stop at the first error)', async () => {
    const err = await app.expectError({
      url: '',
      method: 'GET',
      headers: {
        shortstring: 'short',
        // numeric: '123',
        bool: '1',
        sessionid: 'sessionid',
      },
    })

    expect(err.data.responseStatusCode).toBe(400)
    expect(err.cause.message).toContain(
      'request headers/shortstring must NOT have fewer than 8 characters',
    )
    expect(err.cause.message).toContain("request headers must have required property 'numeric'")
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
    expect(err.cause.message).toContain("REDACTED: 'REDACTED'")
    expect(err.cause.message).not.toContain('sessionid')
  })
})
