import { _ms } from '@naturalcycles/js-lib/datetime/time.util.js'
import { AppError } from '@naturalcycles/js-lib/error/error.util.js'
import type { NumberOfSeconds } from '@naturalcycles/js-lib/types'
import { onFinished } from '../onFinished.js'
import { respondWithError } from './genericErrorMiddleware.js'
import { getRequestEndpoint } from './request.util.js'
import type { BackendRequest, BackendRequestHandler, BackendResponse } from './server.model.js'

export interface RequestTimeoutMiddlewareCfg {
  /**
   * @default 120
   */
  timeoutSeconds?: NumberOfSeconds

  /**
   * @default 503
   */
  backendResponseStatusCode?: number

  /**
   * @default 'Request timed out'
   */
  httpErrorMessage?: string

  /**
   * Upper bound for the `?requestTimeout=N` query override.
   * Higher values are clamped to it, so a client cannot hold a request open for arbitrarily long.
   *
   * @default 600
   */
  maxTimeoutSeconds?: NumberOfSeconds
}

const code = 'REQUEST_TIMEOUT'
const REQUEST_TIMEOUT_QUERY_KEY = 'requestTimeout'

export function requestTimeoutMiddleware(
  cfg: RequestTimeoutMiddlewareCfg = {},
): BackendRequestHandler {
  const {
    timeoutSeconds: defTimeoutSeconds,
    backendResponseStatusCode,
    httpErrorMessage,
    maxTimeoutSeconds,
  } = {
    // Considerations about the default value of the timeout.
    // Ideally the default value here would be HIGHER than the default timeout for getGot (in nodejs-lib),
    // so, cross-service communication has a chance to fail SOONER than server times out,
    // so, proper error from exact service is shown, rather than generic "503 request timed out"
    timeoutSeconds: 120,
    backendResponseStatusCode: 503,
    httpErrorMessage: 'Request timed out',
    maxTimeoutSeconds: 600,
    ...cfg,
  }

  return function requestTimeoutHandler(req, res, next) {
    const timeoutSeconds = getTimeoutSeconds(req, defTimeoutSeconds, maxTimeoutSeconds)

    // If requestTimeout was previously set - cancel it first
    // Then set the new requestTimeout and handler
    if (req.requestTimeout) clearTimeout(req.requestTimeout)

    req.requestTimeout = setTimeout(() => {
      const endpoint = getRequestEndpoint(req)
      const msg = `${httpErrorMessage} on ${endpoint} after ${_ms(timeoutSeconds * 1000)}`

      respondWithError(
        req,
        res,
        new AppError(msg, {
          code,
          backendResponseStatusCode,
          endpoint,
          timeoutSeconds,
          // userFriendly: true, // no, cause this error is not expected
        }),
      )
    }, timeoutSeconds * 1000)

    onFinished(res, () => clearTimeout(req.requestTimeout))

    next()
  }
}

/**
 * `?requestTimeout=N` query param lets the client override the timeout of its request
 * (used e.g by Cloud Tasks for long-running tasks).
 * Being client-controlled, it is validated: non-numeric or non-positive values are ignored
 * (fall back to the default), values above `maxTimeoutSeconds` are clamped.
 */
function getTimeoutSeconds(
  req: BackendRequest,
  defTimeoutSeconds: NumberOfSeconds,
  maxTimeoutSeconds: NumberOfSeconds,
): NumberOfSeconds {
  const raw = req.query[REQUEST_TIMEOUT_QUERY_KEY]
  if (typeof raw !== 'string') return defTimeoutSeconds

  const requested = Number.parseInt(raw, 10)
  if (Number.isNaN(requested) || requested <= 0) return defTimeoutSeconds

  return Math.min(requested, maxTimeoutSeconds)
}

export interface CustomRequestTimeoutMiddlewareCfg {
  /**
   * @default 120
   */
  timeoutSeconds?: NumberOfSeconds
}

/**
 * Example:
 *
 * router.get('/', customRequestTimeoutMiddleware(
 *   (req, res) => res.status(409).type('text/plain').send('my custom message!'),
 *   { timeoutSeconds: 30 },
 * )
 */
export function customRequestTimeoutMiddleware(
  onTimeout: (req: BackendRequest, res: BackendResponse) => void | Promise<void>,
  cfg: CustomRequestTimeoutMiddlewareCfg,
): BackendRequestHandler {
  const { timeoutSeconds = 120 } = cfg

  return function customRequestTimeoutHandler(req, res, next) {
    if (req.requestTimeout) clearTimeout(req.requestTimeout)

    req.requestTimeout = setTimeout(async () => {
      try {
        await onTimeout(req, res)
      } catch (err) {
        next(err)
      }
    }, timeoutSeconds * 1000)

    onFinished(res, () => clearTimeout(req.requestTimeout))

    next()
  }
}
