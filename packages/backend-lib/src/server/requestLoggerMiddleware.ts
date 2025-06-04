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

    req.log([req.method, req.originalUrl, req.userId].filter(Boolean).join(' '))

    onFinished(res, () => {
      req.log(
        [res.statusCode || '0', _since(started), req.method, req.originalUrl, req.userId]
          .filter(Boolean)
          .join(' '),
      )
    })

    next()
  }
}
