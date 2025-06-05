import type { UnixTimestampMillis } from '@naturalcycles/js-lib'
import { _since } from '@naturalcycles/js-lib'
import type { BackendRequestHandler } from '../index.js'
import { onFinished } from '../index.js'

/**
 * Experimental request logger for Cloud Run.
 *
 * @experimental
 */
export function requestLoggerMiddleware(): BackendRequestHandler {
  return (req, res, next) => {
    const started = Date.now() as UnixTimestampMillis

    // todo: include requestId (3-character hash of it?)
    req.log(['>>', req.method, req.originalUrl, req.userId].filter(Boolean).join(' '))

    onFinished(res, () => {
      const str = ['<<', res.statusCode, _since(started), req.method, req.originalUrl, req.userId]
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
