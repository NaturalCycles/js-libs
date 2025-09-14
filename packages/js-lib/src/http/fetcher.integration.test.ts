import type { LookupAddress } from 'node:dns'
import dns from 'node:dns/promises'
import { testOnline } from '@naturalcycles/dev-lib/testing/testOffline'
import { Pipeline } from '@naturalcycles/nodejs-lib/stream'
import { Agent, fetch as undiciFetch } from 'undici'
import { expect, expectTypeOf, test } from 'vitest'
import { _since, localTime } from '../datetime/index.js'
import { HttpRequestError, TimeoutError } from '../error/error.util.js'
import { pExpectedError } from '../error/try.js'
import { objectToFormData } from '../form.util.js'
import { _stringify } from '../string/stringify.js'
import { tmpDir } from '../test/paths.js'
import { getFetcher } from './fetcher.js'

testOnline()

test('basic get', async () => {
  const fetcher = getFetcher({
    debug: true,
  })
    .onBeforeRequest(() => {
      console.log('before')
    })
    .onAfterResponse(res => {
      console.log('after')
      expect(res.ok).toBe(true)
      expect(res.err).toBeUndefined()
    })
  const r = await fetcher.get(`https://kg-backend3.appspot.com`, {
    searchParams: {
      a: 'b',
    },
  })
  // console.log(r)
  expect(r).toEqual({ ok: 1 })
})

test('post with error', async () => {
  const fetcher = getFetcher({
    debug: true,
  })
  const r = await fetcher.doFetch<number>({
    url: `https://kg-backend3.appspot.com`,
    method: 'POST',
    errorData: { a: 'aa' },
  })
  expect(r.ok).toBe(false)
  expect(r.err).toBeInstanceOf(HttpRequestError)
  const err = r.err as HttpRequestError
  err.data.requestDuration = 10 // stabilize the test
  expect(err.data).toMatchInlineSnapshot(`
{
  "a": "aa",
  "requestDuration": 10,
  "requestMethod": "POST",
  "requestSignature": "POST https://kg-backend3.appspot.com/",
  "requestUrl": "https://kg-backend3.appspot.com",
  "responseStatusCode": 404,
}
`)
  expect(err.message).toMatchInlineSnapshot(`"404 POST https://kg-backend3.appspot.com/"`)
  expect(err.cause).toMatchInlineSnapshot(`
    {
      "data": {},
      "message": "404 Not Found: POST /",
      "name": "Error",
    }
  `)
  expect(_stringify(r.err)).toMatchInlineSnapshot(`
    "HttpRequestError: 404 POST https://kg-backend3.appspot.com/
    Caused by: Error: 404 Not Found: POST /"
  `)

  if (r.ok) {
    expectTypeOf(r.err).toBeUndefined()
    expectTypeOf(r.body).toMatchTypeOf<number>()
  } else {
    expectTypeOf(r.err).toMatchTypeOf<Error>()
    expectTypeOf(r.body).toMatchTypeOf<number | undefined>()
  }
})

test('getReadableStream', async () => {
  const fetcher = getFetcher({
    debug: true,
  })

  const r = await fetcher.getReadableStream(`https://kg-backend3.appspot.com`)

  // https://css-tricks.com/web-streams-everywhere-and-fetch-for-node-js/
  // Example of Node.js streams interop
  await Pipeline.fromWeb(r).toFile(`${tmpDir}/resp.txt`)
})

test('redirect: error', async () => {
  const fetcher = getFetcher({
    debug: true,
  })

  const r = await fetcher.doFetch({
    url: 'http://naturalcycles.com', // shall redirect to https
    redirect: 'error',
  })
  expect(r.ok).toBe(false)
  expect(_stringify(r.err)).toMatchInlineSnapshot(`
    "HttpRequestError: GET http://naturalcycles.com/
    Caused by: TypeError: fetch failed
    Caused by: Error: unexpected redirect"
  `)
})

test('redirect: manual', async () => {
  const fetcher = getFetcher({
    debug: true,
  })

  const r = await fetcher.doFetch({
    url: 'http://naturalcycles.com', // shall redirect to https
    redirect: 'manual',
  })
  expect(r.ok).toBe(false)
  expect(_stringify(r.err)).toMatchInlineSnapshot(`
    "HttpRequestError: 301 GET http://naturalcycles.com/
    Caused by: Error: Fetch failed"
  `)
  expect(r.fetchResponse!.status).toBe(301)
  expect(r.fetchResponse!.headers.get('location')).toBe('https://naturalcycles.com/')
  expect(r.body).toBe('')
})

test('timeout', async () => {
  const fetcher = getFetcher({
    debug: true,
    timeoutSeconds: 1,
    retry: { count: 0 },
  })

  const err = await pExpectedError(
    fetcher.get(`https://kg-backend3.appspot.com/slow`),
    HttpRequestError,
  )
  // console.log(err)
  expect(_stringify(err)).toMatchInlineSnapshot(`
    "HttpRequestError: GET https://kg-backend3.appspot.com/slow
    Caused by: TimeoutError: request timed out after 1 sec"
  `)
  expect(err.cause.name).toBe(TimeoutError.name)
})

test('timeout retries', async () => {
  const fetcher = getFetcher({
    debug: true,
    timeoutSeconds: 1,
  })

  const { err } = await fetcher.doFetch({ url: `https://kg-backend3.appspot.com/slow` })
  console.log(err)
  console.log(_stringify(err))
}, 20_000)

const webhookUrl = 'https://webhook.site/07577dc5-8a0a-4e21-866b-a3bdbaf641f4'

test.skip('formData', async () => {
  const fetcher = getFetcher({
    debug: true,
    retry: { count: 0 },
  })

  await fetcher.post(webhookUrl, {
    form: {
      a: 'a',
      b: 2,
    },
  })

  // to compare with how Got is doing it
  // await getGot().post('https://webhook.site/07577dc5-8a0a-4e21-866b-a3bdbaf641f4', {
  //     form: {
  //       a: 'a',
  //       b: 2,
  //     },
  //   }).json()
})

test.skip('formData with blob', async () => {
  const fetcher = getFetcher({
    debug: true,
    retry: { count: 0 },
  })

  const buf = Buffer.from('asdfsdfsdf')

  await fetcher.post(webhookUrl, {
    json: { a: 'a' },
    headers: {
      lo: 'lo',
    },
  })

  await fetcher.post('https://webhook.site/f7dba637-38ac-4b3c-a29b-1b5adeb04fd2', {
    body: objectToFormData({
      a: 'a',
      b: new Blob([buf]),
    }),
  })
})

test('with custom Agent', async () => {
  const dispatcher = new Agent({
    allowH2: true,
    keepAliveTimeout: 30_000,
    keepAliveMaxTimeout: 60_000,

    connect: {
      async lookup(hostname, opt, cb) {
        console.log('dns lookup:', hostname)
        const started = localTime.nowUnixMillis()
        const address = await dns.lookup(hostname, opt)
        console.log(`dns lookup of ${hostname} resolved in ${_since(started)}`)
        console.log({ address })
        cb(null, address as LookupAddress[])
      },
    },
  })

  const fetcher = getFetcher({
    dispatcher,
  })

  const r = await fetcher.get(`https://kg-backend3.appspot.com`)
  console.log(r)
  await fetcher.get(`https://kg-backend3.appspot.com`)
  await fetcher.get(`https://kg-backend3.appspot.com`)
  await fetcher.get(`https://kg-backend3.appspot.com`)

  // Fetch with Undici fetch
  await fetcher.get(`https://kg-backend3.appspot.com`, {
    fetchFn: undiciFetch as any, // undiciFetch types are not compatible, todo: fix it
  })

  console.log(dispatcher.stats)
})
