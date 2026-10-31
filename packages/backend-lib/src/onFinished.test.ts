import { AsyncLocalStorage } from 'node:async_hooks'
import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { expect, it } from 'vitest'
import { onFinished } from './onFinished.js'

type Handler = (req: IncomingMessage, res: ServerResponse) => void

it('should call the listener after the response finishes, in the async context of the caller', async () => {
  const als = new AsyncLocalStorage<string>()
  const { promise, resolve } = Promise.withResolvers<[Error | null, ServerResponse, string?]>()

  await withServer(
    (_req, res) => {
      als.run('ctx', () => {
        expect(onFinished(res, (err, msg) => resolve([err, msg, als.getStore()]))).toBe(res)
      })
      setTimeout(() => res.end('ok'), 10)
    },
    async url => {
      expect(await (await fetch(url)).text()).toBe('ok')
      const [err, msg, store] = await promise
      expect(err).toBeNull()
      expect(msg.writableFinished).toBe(true)
      expect(store).toBe('ctx')
    },
  )
})

it('should call the listener asynchronously when the response is already finished', async () => {
  const { promise, resolve } = Promise.withResolvers<Error | null>()

  await withServer(
    (_req, res) => {
      res.end('ok', () => {
        let called = false
        onFinished(res, err => {
          called = true
          resolve(err)
        })
        expect(called).toBe(false)
      })
    },
    async url => {
      await fetch(url)
      expect(await promise).toBeNull()
    },
  )
})

it('should share one set of stream listeners between listeners, each called in its own async context', async () => {
  const als = new AsyncLocalStorage<number>()
  const { promise, resolve } = Promise.withResolvers<number[]>()
  const calls: number[] = []
  let closeListenersAdded = 0

  await withServer(
    (_req, res) => {
      const closeListeners = res.listenerCount('close')
      for (let i = 0; i < 20; i++) {
        als.run(i, () =>
          onFinished(res, () => {
            calls.push(als.getStore()!)
            if (calls.length === 20) resolve(calls)
          }),
        )
      }
      closeListenersAdded = res.listenerCount('close') - closeListeners
      res.end('ok')
    },
    async url => {
      await fetch(url)
      expect(await promise).toEqual(Array.from({ length: 20 }, (_, i) => i))
      expect(closeListenersAdded).toBe(2) // same as a single stream.finished call
    },
  )
})

it('should call the listener with an error when the client aborts the request', async () => {
  const { promise, resolve } = Promise.withResolvers<Error | null>()
  const ac = new AbortController()

  await withServer(
    (_req, res) => {
      onFinished(res, resolve)
      ac.abort()
    },
    async url => {
      await expect(fetch(url, { signal: ac.signal })).rejects.toThrow('This operation was aborted')
      expect(await promise).toMatchObject({ code: 'ERR_STREAM_PREMATURE_CLOSE' })
    },
  )
})

async function withServer(handler: Handler, fn: (url: string) => Promise<void>): Promise<void> {
  const server = createServer(handler)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    await fn(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)
  } finally {
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
  }
}
