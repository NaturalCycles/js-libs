# Fetcher

Convenient wrapper around [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).

## Features

- Works in the Browser and on the Server (Node.js)
- Convenient API, e.g `fetcher.get()`, `fetcher.post()`, etc. Supports the
  [QUERY](https://datatracker.ietf.org/doc/draft-ietf-httpbis-safe-method-w-body/) method
  (`fetcher.query()`): like GET, but with a request body.
- Throws HttpError automatically, no need to check `if (res.ok)`
- Allows to set `timeout`
- Conveniently retries on retry-able errors
- Allows to conveniently log requests/responses, configurable
- Allows to convert `searchParams` object into a query string
- Allows to define `beforeRequest`/`beforeRetry`/`afterResponse` hooks

## Comparison

Fetcher:

```tsx
const fetcher = getFetcher()

const result = await fetcher.post('https://example.com', {
  json: { foo: true },
})
```

Ky:

```tsx
const result = await ky
  .post('https://example.com/hello', {
    json: { foo: true },
  })
  .json()
```

Plain fetch:

```tsx
class HTTPError extends Error {}

const response = await fetch('https://example.com', {
  method: 'POST',
  body: JSON.stringify({ foo: true }),
  headers: {
    'content-type': 'application/json',
  },
})

if (!response.ok) {
  throw new HTTPError(`Fetch error: ${response.statusText}`)
}

const json = await response.json()

console.log(json)
```

## Prior art

Heavily inspired by:

- [ky](https://github.com/sindresorhus/ky),
  [ky-universal](https://github.com/sindresorhus/ky-universal)
- [node-fetch](https://github.com/node-fetch/node-fetch)
- [got](https://github.com/sindresorhus/got)
- [axios](https://github.com/axios/axios)
- getGot ([nodejs-lib](https://github.com/NaturalCycles/nodejs-lib))
- getKy ([frontend-lib](https://github.com/NaturalCycles/frontend-lib))

## Why

Differences from prior projects:

- Targets both Browser and Node by design, targeting Node with
  [native fetch](https://nodejs.org/dist/latest-v18.x/docs/api/globals.html#fetch) support. This is
  similar to `ky` plus `ky-universal`.
- Incorporates everything from getKy and getGot, so you don’t need multiple layers. For example,
  with ky you would need: ky, ky-for-people, getKy (frontend-lib). With fetcher you need only
  fetcher (part of [js-lib](https://github.com/NaturalCycles/js-lib)).

## Goals

- Simplicity. It focuses on the most simple and common use cases, and not on the most advanced or
  edge cases.
- Assume native fetch support (Browser and Node), no polyfills. Should work equally well in Browser
  and Node, ideally without platform-specific quirks.
- Written in TypeScript, with first-class TypeScript support.
