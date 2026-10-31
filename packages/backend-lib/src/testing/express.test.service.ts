import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { Fetcher, FetcherOptions, FetchFunction } from '@naturalcycles/js-lib/http'
import { getFetcher } from '@naturalcycles/js-lib/http'
import { pDelay } from '@naturalcycles/js-lib/promise/pDelay.js'
import { createDefaultApp } from '../express/createDefaultApp.js'
import type { BackendRequestHandlerCfg, DefaultAppCfg } from '../express/createDefaultApp.js'
import type { BackendApplication } from '../server/server.model.js'

const TEST_SERVER_HOST = '127.0.0.1'

const nativeFetchFn: FetchFunction = async (url, init) => await globalThis.fetch(url, init)

export interface ExpressApp extends Fetcher, AsyncDisposable {
  close: () => Promise<void>
}

// Example:
// const app = await expressTestService.createAppFromResource(debugResource)
// afterAll(async () => {
//   await app.close()
// })

class ExpressTestService {
  async createAppFromResource(
    resource: BackendRequestHandlerCfg,
    opt?: FetcherOptions,
    defaultAppCfg?: DefaultAppCfg,
  ): Promise<ExpressApp> {
    return this.createApp(
      await createDefaultApp({
        ...defaultAppCfg,
        resources: [resource],
      }),
      opt,
    )
  }

  async createAppFromResources(
    resources: BackendRequestHandlerCfg[],
    opt?: FetcherOptions,
  ): Promise<ExpressApp> {
    return this.createApp(
      await createDefaultApp({
        resources,
      }),
      opt,
    )
  }

  async createApp(app: BackendApplication, opt?: FetcherOptions): Promise<ExpressApp> {
    const server = await this.createTestServer(app)
    const { port } = server.address() as AddressInfo
    const baseUrl = `http://${TEST_SERVER_HOST}:${port}`

    const fetcher = getFetcher({
      baseUrl,
      responseType: 'json',
      retry: { count: 0 },
      logRequest: true,
      logResponse: true,
      logWithBaseUrl: false, // for stable error snapshots
      fetchFn: nativeFetchFn, // this is to make it NOT mockable
      ...opt,
    }).onAfterResponse(async () => {
      // This "empty" hook exists to act like `await pDelay`,
      // so tests using it can reply on `void someAnalyticsService.doSmth()` promises
      // to be done by that time.
      // Smart, huh?
      await pDelay()
    }) as ExpressApp

    fetcher.close = async () => {
      // const started = Date.now()
      // await new Promise(resolve => server.close(resolve))
      // console.log(`close took ${_since(started)}`) // todo: investigate why it takes ~5 seconds!
      // Kirill: not awaiting the server-close, otherwise it takes significant waiting time
      // to "teardown" server after it's been hit by Fetcher
      // server.close()
      // 2024-08-31: server.close is no longer slow, so now we're back at awaiting it
      await new Promise(resolve => {
        server.unref().close(resolve)
      })
      await pDelay()
    }

    fetcher[Symbol.asyncDispose] = async () => await fetcher.close()

    return fetcher
  }

  /**
   * Creates a "Default Express App" with provided resources.
   * Starts an http server on '127.0.0.1' and random available port.
   *
   * To get a server url:
   * const { port } = server.address() as AddressInfo
   * const url = `http://127.0.0.1:${port}`
   */
  private async createTestServer(app: BackendApplication): Promise<Server> {
    // Important!
    // Listening on the same host that the Fetcher connects to.
    // `app.listen(0)` (without a hostname) listens on all interfaces (`::`), and the OS (e.g macOS)
    // may give it a port that some other process (e.g IntelliJ on 63342) already listens on
    // at 127.0.0.1. Requests to 127.0.0.1 would then reach that other process instead.
    // Listening on 127.0.0.1 makes the OS pick a port that is free on 127.0.0.1.
    // The downside is that the port is only known after the async `listening` callback
    // (server.address() returns null until then).
    // enableDestroy(server)
    return await new Promise<Server>((resolve, reject) => {
      const server = app.listen(0, TEST_SERVER_HOST, (err?: Error) => {
        if (err) return reject(err)
        resolve(server)
      })
    })
  }
}

export const expressTestService = new ExpressTestService()
