import type { UnixTimestampMillis } from '@naturalcycles/js-lib'
import { _since } from '@naturalcycles/js-lib'
import type { BackendRequestHandler } from '../index.js'
import { onFinished } from '../index.js'

export interface RequestLoggerMiddlewareCfg {
  /**
   * If set - this prefix will be removed from the request url before logging.
   */
  removeUrlPrefix?: string
}

/**
 * Experimental request logger for Cloud Run.
 *
 * @experimental
 */
export function requestLoggerMiddleware(
  cfg: RequestLoggerMiddlewareCfg = {},
): BackendRequestHandler {
  const { removeUrlPrefix } = cfg
  const removeUrlPrefixLength = removeUrlPrefix?.length

  return (req, res, next) => {
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
