import { _split } from '@naturalcycles/js-lib/string/string.util.js'
import type { StringMap } from '@naturalcycles/js-lib/types'
import { base64ToString, timingSafeStringEqual } from '@naturalcycles/nodejs-lib'
import type { BackendRequestHandler } from './server.model.js'

export interface BasicAuthMiddlewareCfg {
  /**
   * Map from login (Sting) to password (String).
   */
  loginPasswordMap: StringMap

  /**
   *
   */
  realm?: string
}

export function basicAuthMiddleware(cfg: BasicAuthMiddlewareCfg): BackendRequestHandler {
  const { realm } = cfg

  return function basicAuthMiddlewareHandler(req, res, next) {
    const hash = (req.headers.authorization || '').split(' ')[1]
    if (hash) {
      const [login, password] = _split(base64ToString(hash), ':', 2)
      if (login && password && timingSafeStringEqual(cfg.loginPasswordMap[login], password)) {
        return next()
      }
    }

    // Unauthorized
    res
      .set('WWW-Authenticate', `Basic${realm ? ` realm="${realm}"` : ''}`)
      .status(401)
      .send('Unauthorized')
  }
}
