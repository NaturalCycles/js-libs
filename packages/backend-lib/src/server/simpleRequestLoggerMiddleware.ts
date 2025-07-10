import type { UnixTimestampMillis } from '@naturalcycles/js-lib'
import { _since } from '@naturalcycles/js-lib'
import { boldGrey, dimGrey } from '@naturalcycles/nodejs-lib/colors'
import { onFinished } from '../onFinished.js'
import { logRequestWithColors } from './request.log.util.js'
import type { BackendRequestHandler } from './server.model.js'

export interface SimpleRequestLoggerMiddlewareCfg {
  /**
   * @default false
   */
  logStart: boolean

  /**
   * @default true
   */
  logFinish: boolean
}

export function simpleRequestLoggerMiddleware(
  cfg: Partial<SimpleRequestLoggerMiddlewareCfg> = {},
): BackendRequestHandler {
  const { logStart = false, logFinish = true } = cfg

  return (req, res, next) => {
    const started = Date.now() as UnixTimestampMillis

    if (logStart) {
      req.log(['>>', req.method, boldGrey(req.url)].join(' '))
    }

    if (logFinish) {
      onFinished(res, () => {
        logRequestWithColors(req, res.statusCode, dimGrey(_since(started)))
      })
    }

    next()
  }
}
