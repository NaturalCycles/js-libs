import { _since } from '@naturalcycles/js-lib/datetime/time.util.js'
import type { UnixTimestampMillis } from '@naturalcycles/js-lib/types'
import { onFinished } from '../onFinished.js'
import type { BackendRequest, BackendRequestHandler } from './server.model.js'

export interface RequestLoggerMiddlewareCfg {
  /**
   * If set - this prefix will be removed from the request url before logging.
   */
  removeUrlPrefix?: string

  /**
   * If set - will be run to determine whether to log the request or not.
   * Predicate should return true to log the request.
   */
  predicate?: (req: BackendRequest) => boolean
}

/**
 * Experimental request logger for Cloud Run.
 *
 * @experimental
 */
export function requestLoggerMiddleware(
  cfg: RequestLoggerMiddlewareCfg = {},
): BackendRequestHandler {
  const { removeUrlPrefix, predicate } = cfg
  const removeUrlPrefixLength = removeUrlPrefix?.length

  return (req, res, next) => {
    if (predicate && !predicate(req)) {
      return next()
    }

    const started = Date.now() as UnixTimestampMillis

    let url = req.originalUrl.split('?')[0]!
    if (removeUrlPrefix && url.startsWith(removeUrlPrefix)) {
      url = url.slice(removeUrlPrefixLength)
    }

    // todo: include requestId (3-character hash of it?)
    req.log(['>>', req.method, url, req.userId].filter(Boolean).join(' '))

    onFinished(res, () => {
      const str = ['<<', res.statusCode, _since(started), req.method, url, req.userId]
        .filter(Boolean)
        .join(' ')

      if (res.statusCode && res.statusCode >= 400) {
        req.error(str)
      } else {
        req.log(str)
      }
    })

    next()
  }
}
