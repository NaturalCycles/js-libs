import { afterAll, expect, test } from 'vitest'
import { debugResource } from '../test/debug.resource.js'
import { expressTestService } from '../testing/index.js'

const app = await expressTestService.createAppFromResource(debugResource)

afterAll(async () => {
  await app.close()
})

test('should respond with 404 as plain text', async () => {
  const res = await app.doFetch<string>({
    url: 'unknownRoute',
    responseType: 'text',
    throwHttpErrors: false,
  })

  expect(res.statusCode).toBe(404)
  expect(res.fetchResponse!.headers.get('content-type')).toBe('text/plain; charset=utf-8')
  expect(res.body).toBe('404 Not Found: GET /unknownroute')
})

test('should not override the request method with the _method query param', async () => {
  const res = await app.doFetch<string>({
    url: 'unknownRoute',
    searchParams: { _method: '<img src=x onerror=alert(1)>' },
    responseType: 'text',
    throwHttpErrors: false,
  })

  expect(res.statusCode).toBe(404)
  expect(res.body).toBe('404 Not Found: GET /unknownroute')
})
