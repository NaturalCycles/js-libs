import { AsyncLocalStorage } from 'node:async_hooks'
import type { CommonLogger } from '@naturalcycles/js-lib'
import { _lazyValue } from '@naturalcycles/js-lib'
import { ciLogger, devLogger, gcpStructuredLogger } from './logMiddleware.js'
import type { BackendRequest, BackendRequestHandler } from './server.model.js'

const { GAE_INSTANCE, K_SERVICE, CI } = process.env
const isGAE = !!GAE_INSTANCE
const isCI = !!CI
const isCloudRun = !!K_SERVICE

export interface RequestLocalStorage {
  req: BackendRequest
}

// Singleton, for simplicity
// Create it lazily (on demand)
const storage = _lazyValue(() => new AsyncLocalStorage<RequestLocalStorage>())

export function asyncLocalStorageMiddleware(): BackendRequestHandler {
  return (req, _res, next) => {
    const store: RequestLocalStorage = {
      req,
    }

    storage().run(store, () => next())
  }
}

export function getRequest(): BackendRequest | undefined {
  return storage().getStore()?.req
}

/**
 * It requires both `createAsyncLocalStorage` and `createGAELogMiddleware` to be in use to work.
 *
 * @experimental
 */
export function getRequestLogger(): CommonLogger {
  return (
    storage().getStore()?.req ||
    (isGAE || isCloudRun ? gcpStructuredLogger : isCI ? ciLogger : devLogger)
  )
}

/**
 * CommonLogger implementation that is Request-bound.
 * Should work the same as `req.log`, except that you don't have to have `req` available - it'll get it
 * from AsyncLocalStorage.
 *
 * It does `getRequestLogger` call on EVERY log call (may be slow, but worth trying).
 *
 * @experimental
 */
export const requestLogger: CommonLogger = {
  log: (...args) => getRequestLogger().log(...args),
  warn: (...args) => getRequestLogger().warn(...args),
  error: (...args) => getRequestLogger().error(...args),
}
