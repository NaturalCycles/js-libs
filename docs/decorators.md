# Decorators

## @\_Debounce

Wrapper around [\_debounce](./time.md#debounce).

## @\_Throttle

Wrapper around [\_throttle](./time.md#throttle).

## @\_LogMethod

Allows to Log every execution of the method.

Console-logs when method had started, when it finished, time taken and if error happened.

Supports both sync and async methods.

Awaits if method returns a Promise.

Example output:

```
>> syncMethodSuccess()
<< syncMethodSuccess() took 124 ms

>> asyncMethod()
<< asyncMethodThrow() took 10 ms ERROR: MyError
```

```ts
class C {
  @_LogMethod()
  async hello() { ... }
}
```

## @\_Memo

Powerful Memoization decorator.

Simplest usage:

```ts
class C {
  @_Memo()
  async init() { ... }
}

await c.init() // first time will run the initialization

await c.init() // second time it'll skip it
// Allows "max 1 execution" pattern
```

Memoization caches values for each unique set of input parameters. So, e.g, if you want to hit a
somewhat slow/expensive endpoint, you may want to cache it in memory like this:

```ts
class C {
  @_Memo()
  async getExchangeRates(day: string) { ... }
}

// First time will hit the endpoint
await c.getExchangeRates('2021-06-21')

// Second time will immediately return cached result, cause the input is the same
await c.getExchangeRates('2021-06-21')

// Input has changed, so it's a cache-miss, will hit the endpoint
await c.getExchangeRates('2021-06-22')
```

Pay attention that the cache of the returned values is kept **forever**, so, be mindful of possible
memory leaks.

`nodejs-lib` (link pending) has a `LRUMemoCache` class that impements LRU cache. Example:

```ts
@_Memo({ cacheFactory: () => new LRUMemoCache({...}) })
async someMethod() {}
```

For an async method it's the returned **Promise** that is cached, so parallel calls with the same
arguments share one in-flight Promise (no "async swarm"). A rejected Promise is evicted from the
cache, so the next call retries the method (e.g an `init()` that may fail). Same as a thrown Error,
which is never cached.

## @\_AsyncMemo

Like `@_Memo`, but awaits the method and caches the resolved **value**, not the Promise:

- The cache is async (`AsyncMemoCache`), so it can be backed by e.g Redis or Datastore
  (`CommonKeyValueDaoMemoCache` from `db-lib`) and survive a process restart. That's the reason to
  use it over `@_Memo`, which is simpler and serves a cache hit synchronously.
- A rejection is not cached, so the next call retries the method (same as `@_Memo`).
- Parallel calls with the same arguments share one in-flight Promise (no "async swarm").

Defaults to the in-memory `MapAsyncMemoCache`, which never expires:

```ts
class C {
  @_AsyncMemo()
  async init() { ... }

  // LRUAsyncMemoCache from nodejs-lib: ttl and max size
  @_AsyncMemo({ cacheFactory: () => new LRUAsyncMemoCache({ ttl: 60_000 }) })
  async getConfig() { ... }
}
```

Cache errors (`get`/`set`) are logged and treated as a miss, they never fail the method.

## @\_Retry

Wrapper around [pRetry](./promise.md#pretry).

## @\_Timeout

Decoratod method will throw TimeoutError if it hasn't finished in given time.

Wrapper around [pTimeout](./promise.md#ptimeout).

```ts
class C {
  @_Timeout({ timeout: 1000 })
  async hello() {
    // some logic
  }
}

const c = new C()
await c.hello()
// will throw if not finished in 1000 ms
```

## @\_TryCatch

Wraps the method into a try/catch block, `console.error(err)` on error, but never re-throws (always
suppresses the error).

```ts
class C {
  @_TryCatch() // fine if it fails
  async logSomeAnalytics() {}
}
```

Wrapper around [\_tryCatch](./error.md#trycatch) function.

## \_createPromiseDecorator

Powerful helper to create your own Decorators around async (Promise-returning) methods.

Example of a `@TryCatch` decorator that will wrap a method with "try/catch", `console.error` the
error and suppress it (by returning `undefined` in case of any error).

Example usage:

```ts
class C {
  @TryCatch() // fine if it fails
  async logSomeAnalytics() {}
}
```

Example implementation of such a decorator using `_createPromiseDecorator`:

```ts
export const TryCatch = () =>
  _createPromiseDecorator({
    decoratorName: 'TryCatch',
    catchFn: ({ err, target, key }) => {
      console.error(err)
      return undefined
    },
  })
```

`_createPromiseDecorator` allows you to define your "hooks" on different stages of a Promise:

- `beforeFn`: before the method execution
- `thenFn`: after successful method execution
- `catchFn`: after method throws (returns rejected Promise)
- `finallyFn`: after method returns resolved or rejected Promise (useful to e.g "hide the blocking
  loader")

Example of a `@BlockingLoader` decorator, that wraps the method, shows the BlockingLoader before the
method execution and hides it in the end of the execution (regardless if it errored or succeeded):

```ts
export const BlockingLoader = () =>
  _createPromiseDecorator({
    decoratorName: 'BlockingLoader',
    beforeFn: () => store.commit('setBlockingLoader'),
    catchFn: ({ err }) => errorDialog(err),
    finallyFn: () => store.commit('setBlockingLoader', false),
  })
```
