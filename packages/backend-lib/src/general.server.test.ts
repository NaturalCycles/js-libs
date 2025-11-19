import { _range } from '@naturalcycles/js-lib/array/range.js'
import {
  _assert,
  _isErrorObject,
  AppError,
  HttpRequestError,
  pExpectedError,
} from '@naturalcycles/js-lib/error'
import { anySchema, arraySchema, objectSchema } from '@naturalcycles/nodejs-lib/joi'
import { deflateString } from '@naturalcycles/nodejs-lib/zip'
import { afterAll, expect, test } from 'vitest'
import { getDefaultRouter } from './express/getDefaultRouter.js'
import { safeJsonMiddleware } from './server/safeJsonMiddleware.js'
import type { BackendRequest } from './server/server.model.js'
import { expressTestService } from './testing/index.js'
import { validateRequest } from './validation/joi/joiValidateRequest.js'

const router = getDefaultRouter()

router.put('/rawBody', async (req: BackendRequest, res) => {
  const body = JSON.parse(req.rawBody!.toString())
  res.json(body)
})

router.get('/circular', safeJsonMiddleware(), async req => {
  // console.log(inspectAny(req))

  throw new AppError('the error', {
    backendResponseStatusCode: 500,
    req,
  })
})

router.post('/compressedBody', async (req, res) => {
  const body = validateRequest.body(
    req,
    objectSchema({
      items: arraySchema(anySchema),
    }),
  )

  res.json(body)
})

const app = await expressTestService.createAppFromResource(router)

afterAll(async () => {
  await app.close()
})

test('should not crash on circular objects in errors', async () => {
  const err = await pExpectedError(app.get('circular'), HttpRequestError)
  // console.log(err)
  // console.log(err.response.body)
  _assert(_isErrorObject(err.cause))
  // const cause = err.response.body.error
  // console.log((cause.data as any).req)
})

test('should support compressed body', async () => {
  // "large" input with 10k objects
  const input = {
    items: _range(1, 10_001).map(id => ({ id })),
  }

  const body = await deflateString(JSON.stringify(input))
  console.log(body.byteLength)

  const output = await app.post('compressedBody', {
    headers: {
      'content-type': 'application/json',
      'content-encoding': 'deflate',
    },
    body,
  })

  // console.log(output)
  expect(output).toEqual(input)
})

test('should return parsed rawBody', async () => {
  const body = {
    a: 'aa',
  }

  const r = await app.put('rawBody', {
    json: body,
  })

  expect(r).toEqual(body)
})
