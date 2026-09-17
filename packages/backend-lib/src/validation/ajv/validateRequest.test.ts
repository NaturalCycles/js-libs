import { _try } from '@naturalcycles/js-lib/error'
import { AppError } from '@naturalcycles/js-lib/error/error.util.js'
import { _deepCopy } from '@naturalcycles/js-lib/object'
import type { AnyObject, StringMap } from '@naturalcycles/js-lib/types'
import { _inspect } from '@naturalcycles/nodejs-lib'
import { j } from '@naturalcycles/nodejs-lib/ajv'
import type { SchemaHandledByAjv } from '@naturalcycles/nodejs-lib/ajv'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { getDefaultRouter } from '../../express/getDefaultRouter.js'
import { debugResource } from '../../test/debug.resource.js'
import type { ExpressApp } from '../../testing/index.js'
import { expressTestService } from '../../testing/index.js'
import { validateRequest } from './validateRequest.js'

const app = await expressTestService.createAppFromResource(debugResource)

afterAll(async () => {
  await app.close()
})

describe('ajvValidateRequest', () => {
  describe('body (kirill)', () => {
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
                "instancePath": ".pw",
                "keyword": "minLength",
                "message": "must NOT have fewer than 8 characters",
                "params": {
                  "limit": 8,
                },
                "schemaPath": "#/properties/pw/minLength",
              },
            ],
            "fingerprint": "request.body.pw minLength:8",
            "inputName": "request.body",
          },
          "message": "request.body.pw must NOT have fewer than 8 characters
        Got: REDACTED
        Input: { pw: 'REDACTED' }",
          "name": "AppError",
        }
      `)

      expect(_inspect(err.cause)).toMatchInlineSnapshot(`
        "AppError: request.body.pw must NOT have fewer than 8 characters
        Got: REDACTED
        Input: { pw: 'REDACTED' }"
      `)
    })
  })

  describe('body (david)', () => {
    let app: ExpressApp

    beforeAll(async () => {
      const resource = getDefaultRouter()
      resource.post('/', async (req, res) => {
        const body = validateRequest.body(
          req,
          j.object<{ email: string }>({
            email: j.string().email(),
          }),
        )

        res.json({ ok: 1, body })
      })
      app = await expressTestService.createAppFromResource(resource)
    })

    afterAll(async () => {
      await app.close()
    })

    test('accept an email with whitespaces', async () => {
      const response = await app.post<TestResponse>('', {
        json: { email: 'kamalaharris@gmail.com ' },
      })

      expect(response).toMatchObject({ ok: 1, body: { email: 'kamalaharris@gmail.com' } })
    })

    interface TestResponse {
      ok: 1
      body: { email: string }
    }
  })

  describe('headers', () => {
    let app: ExpressApp
    interface TestResponse {
      ok: 1
      headers: StringMap<any>
      validatedHeaders?: StringMap<any>
    }

    beforeAll(async () => {
      const resource = getDefaultRouter()
      resource.get('/', async (req, res) => {
        validateRequest.headers(
          req,
          j.object<{ shortstring: string; numeric: string; bool: string; sessionid: string }>({
            shortstring: j.string().minLength(8).maxLength(16),
            numeric: j.string(),
            bool: j.string(),
            sessionid: j.string(),
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
        `request.headers.shortstring must NOT have fewer than 8 characters`,
      )
    })

    test('should redact sensitive data', async () => {
      const sessionid = 'abc123secretSession'
      const err = await app.expectError({
        url: '',
        method: 'GET',
        headers: {
          shortstring: 'short',
          numeric: '127',
          bool: '1',
          sessionid,
        },
      })

      expect(err.data.responseStatusCode).toBe(400)
      expect(err.cause.message).toContain(`sessionid: 'REDACTED'`)
      expect(err.cause.message).not.toContain(sessionid)
    })

    test('should replace the headers with the validated value by default', async () => {
      const resource = getDefaultRouter().get('/', async (req, res) => {
        const validatedHeaders = validateRequest.headers(
          req,
          j.object<{ shortstring: string; numeric: string }>({
            shortstring: j.string().minLength(8).maxLength(16),
            numeric: j.string(),
          }),
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

  describe('redactPaths', () => {
    interface LoginInput {
      email: string
      pw: string
    }

    const loginSchema = j.object<LoginInput>({
      email: j.string().email(),
      pw: j.string().minLength(8).maxLength(100),
    })

    function validateBodyExpectError(
      body: AnyObject,
      schema: SchemaHandledByAjv<any>,
      redactPaths: string[],
      opt: { rawBody?: boolean } = {},
    ): AppError {
      const req = { body: _deepCopy(body) } as any
      if (opt.rawBody) req.rawBody = Buffer.from(JSON.stringify(body))
      const [err] = _try(() => validateRequest.body(req, schema, { redactPaths }), AppError)
      expect(err).toBeInstanceOf(AppError)
      return err!
    }

    function expectNoLeak(err: AppError, secret: string): void {
      for (const text of [err.message, err.stack || '']) {
        for (let i = 0; i + 6 <= secret.length; i++) {
          expect(text).not.toContain(secret.slice(i, i + 6))
        }
      }
    }

    test('1. secret that itself fails validation, longer than the Got print cap', () => {
      const pw = 'LongSecretAa'.repeat(100)
      const err = validateBodyExpectError({ email: 'a@b.se', pw }, loginSchema, ['pw'])

      expect(err.message).toContain('request.body.pw must NOT have more than 100 characters')
      expectNoLeak(err, pw)
    })

    test('2. secret with escapable characters, when another field fails', () => {
      for (const pw of [String.raw`Back\slashSecret`, 'Newline\nSecretValue', 'Tab\tSecretValue']) {
        const err = validateBodyExpectError({ email: 'nope', pw }, loginSchema, ['pw'])

        expect(err.message).toContain(`pw: 'REDACTED'`)
        expectNoLeak(err, pw)
      }
    })

    test('3. secret longer than the Input print cap', () => {
      const uncappedSchema = j.object<LoginInput>({
        email: j.string().email(),
        pw: j.string(),
      })
      const pw = 'S3cretPassw0rd'.repeat(360)
      const err = validateBodyExpectError({ email: 'nope', pw }, uncappedSchema, ['pw'])

      expectNoLeak(err, pw)
    })

    test('4. non-string secret', () => {
      const schema = j.object<{ email: string; credentials: AnyObject }>({
        email: j.string().email(),
        credentials: j.object.any(),
      })
      const err = validateBodyExpectError(
        { email: 'nope', credentials: { apiKey: 'ObjSecretKey123' } },
        schema,
        ['credentials'],
      )

      expect(err.message).toContain(`credentials: 'REDACTED'`)
      expectNoLeak(err, 'ObjSecretKey123')
    })

    test('5. secret that the schema transforms or strips, when rawBody is present', () => {
      const transformingSchema = j.object<{ email: string; token: string }>({
        email: j.string().email(),
        token: j.string().toLowerCase(),
      })
      let err = validateBodyExpectError(
        { email: 'nope', token: 'MixedCaseToken99' },
        transformingSchema,
        ['token'],
        { rawBody: true },
      )
      expectNoLeak(err, 'MixedCaseToken99')
      expectNoLeak(err, 'mixedcasetoken99')

      const schemaWithoutPw = j.object<{ email: string }>({
        email: j.string().email(),
      })
      err = validateBodyExpectError(
        { email: 'nope', pw: 'UndeclaredSecret42' },
        schemaWithoutPw,
        ['pw'],
        {
          rawBody: true,
        },
      )
      expectNoLeak(err, 'UndeclaredSecret42')
    })

    test('6. very short secret must not mangle the message or reveal itself', () => {
      const err = validateBodyExpectError({ email: 'a@b.se', pw: 'e' }, loginSchema, ['pw'])

      expect(err.message).toContain('request.body.pw must NOT have fewer than 8 characters')
      expect(err.message).toContain(`pw: 'REDACTED'`)
    })
  })

  describe('query', () => {
    let app: ExpressApp

    enum AlgoVariant {
      THE_BIG_ALGO = 1,
      THE_SMART_ALGO = 2,
    }

    beforeAll(async () => {
      const resource = getDefaultRouter()
      resource.get('/', async (req, res) => {
        const query = validateRequest.query(
          req,
          j.object<{ algoVariant: AlgoVariant }>({
            algoVariant: j.enum(AlgoVariant),
          }),
        )

        res.json({ ok: 1, query })
      })
      app = await expressTestService.createAppFromResource(resource)
    })

    afterAll(async () => {
      await app.close()
    })

    test('should coerce param types properly', async () => {
      const response = await app.get<TestResponse>('?algoVariant=1')

      expect(response).toMatchObject({ ok: 1, query: { algoVariant: 1 } })
    })

    test('should have a properly worded error message', async () => {
      const response = await app.expectError({ url: '?algoVariant=3', method: 'GET' })

      expect(response.message).toMatchInlineSnapshot(`"400 GET /?algoVariant=3"`)
      expect(response.cause.message).toMatchInlineSnapshot(`
        "request.query.algoVariant must be equal to one of the allowed values
        Got: 3
        Input: { algoVariant: '3' }"
      `)
    })

    interface TestResponse {
      ok: 1
      query: { algoVariant: number }
    }
  })

  describe('params', () => {
    let app: ExpressApp

    enum AlgoVariant {
      THE_BIG_ALGO = 1,
      THE_SMART_ALGO = 2,
    }

    beforeAll(async () => {
      const resource = getDefaultRouter()
      resource.get('/:algoVariant', async (req, res) => {
        const params = validateRequest.params(
          req,
          j.object<{ algoVariant: AlgoVariant }>({
            algoVariant: j.enum(AlgoVariant),
          }),
        )

        res.json({ ok: 1, params })
      })
      app = await expressTestService.createAppFromResource(resource)
    })

    afterAll(async () => {
      await app.close()
    })

    test('should coerce param types properly', async () => {
      const response = await app.get<TestResponse>('1')

      expect(response).toMatchObject({ ok: 1, params: { algoVariant: 1 } })
    })

    test('should have a properly worded error message', async () => {
      const response = await app.expectError({ url: '3', method: 'GET' })

      expect(response.message).toMatchInlineSnapshot(`"400 GET /3"`)
      expect(response.cause.message).toMatchInlineSnapshot(`
        "request.params.algoVariant must be equal to one of the allowed values
        Got: 3
        Input: { algoVariant: '3' }"
      `)
    })

    interface TestResponse {
      ok: 1
      params: { algoVariant: number }
    }
  })
})
