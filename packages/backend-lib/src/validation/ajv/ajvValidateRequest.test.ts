import { j } from '@naturalcycles/js-lib/json-schema'
import type { StringMap } from '@naturalcycles/js-lib/types'
import { _inspect } from '@naturalcycles/nodejs-lib'
import { AjvSchema } from '@naturalcycles/nodejs-lib/ajv'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { getDefaultRouter } from '../../express/getDefaultRouter.js'
import { debugResource } from '../../test/debug.resource.js'
import type { ExpressApp } from '../../testing/index.js'
import { expressTestService } from '../../testing/index.js'
import { ajvValidateRequest } from './ajvValidateRequest.js'

const app = await expressTestService.createAppFromResource(debugResource)

afterAll(async () => {
  await app.close()
})

test('ajvValidateRequest', async () => {
  // should pass (no error)
  await app.put('changePasswordAjv', {
    json: {
      pw: 'longEnough',
    },
  })

  const pw = 'short'
  const err = await app.expectError({
    url: 'changePasswordAjv',
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
        "errors": [
          {
            "instancePath": "/pw",
            "keyword": "minLength",
            "message": "must NOT have fewer than 8 characters",
            "params": {
              "limit": 8,
            },
            "schemaPath": "#/properties/pw/minLength",
          },
        ],
        "inputName": "request body",
      },
      "message": "request body/pw must NOT have fewer than 8 characters
    Input: { pw: 'REDACTED' }",
      "name": "AppError",
    }
  `)

  expect(_inspect(err.cause)).toMatchInlineSnapshot(`
    "AppError: request body/pw must NOT have fewer than 8 characters
    Input: { pw: 'REDACTED' }"
  `)
})

describe('ajvValidateRequest.headers', () => {
  let app: ExpressApp
  interface TestResponse {
    ok: 1
    headers: StringMap<any>
    validatedHeaders?: StringMap<any>
  }

  beforeAll(async () => {
    const resource = getDefaultRouter()
    resource.get('/', async (req, res) => {
      ajvValidateRequest.headers(
        req,
        AjvSchema.create(
          j.object({
            shortstring: j.string().min(8).max(16),
            numeric: j.string(),
            bool: j.string(),
            sessionid: j.string(),
          }),
        ),
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
      `request headers/shortstring must NOT have fewer than 8 characters`,
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
    expect(err.cause.message).toContain("REDACTED: 'REDACTED'")
    expect(err.cause.message).not.toContain('sessionid')
  })

  test('should replace the headers with the validated value by default', async () => {
    const resource = getDefaultRouter().get('/', async (req, res) => {
      const validatedHeaders = ajvValidateRequest.headers(
        req,
        AjvSchema.create(
          j.object({
            shortstring: j.string().min(8).max(16),
            numeric: j.string(),
          }),
        ),
      )

      res.json({ ok: 1, headers: req.headers, validatedHeaders })
    })
    await using app = await expressTestService.createAppFromResource(resource)

    const response = await app.get<TestResponse>('', {
      headers: {
        shortstring: 'shortstring',
        numeric: '123',
        foo: 'bar',
      },
    })

    expect(response.validatedHeaders).toEqual({
      shortstring: 'shortstring',
      numeric: '123', // NOT converted to number
      // foo: 'bar' // fields not in the schema are removed
    })

    expect(response.headers).toMatchObject({
      foo: 'bar',
      'user-agent': expect.any(String),
    })
  })
})
