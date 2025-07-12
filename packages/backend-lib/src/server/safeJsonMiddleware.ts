import { _safeJsonStringify } from '@naturalcycles/js-lib/string/safeJsonStringify.js'
import type { BackendRequestHandler, BackendResponse } from './server.model.js'

/**
 * Replaces express's built-in req.json() function with the safe one,
 * protected from circular references.
 *
 * Original: https://github.com/expressjs/express/blob/master/lib/response.js
 */
export function safeJsonMiddleware(): BackendRequestHandler {
  return function safeJsonHandler(_req, res, next) {
    res.json = (input: any): BackendResponse => {
      if (!res.get('Content-Type')) {
        res.set('Content-Type', 'application/json')
      }

      return res.send(_safeJsonStringify(input))
    }

    next()
  }
}
