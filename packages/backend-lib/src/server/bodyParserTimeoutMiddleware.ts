import { AppError } from '@naturalcycles/js-lib'
import { respondWithError } from './genericErrorMiddleware.js'
import type { BackendRequestHandler } from './server.model.js'

export interface BodyParserTimeoutMiddlewareCfg {
  /**
   * @default 10
   */
  timeoutSeconds?: number

  /**
   * @default 400
   */
  backendResponseStatusCode?: number

  /**
   * @default 'Timeout reading request input'
   */
  httpStatus?: string
}

const code = 'BODY_PARSER_TIMEOUT'

/**
 * Should be called BEFORE bodyParser
 */
export function bodyParserTimeoutMiddleware(
  cfg: BodyParserTimeoutMiddlewareCfg = {},
): BackendRequestHandler {
  const { timeoutSeconds, backendResponseStatusCode, httpStatus } = {
    timeoutSeconds: 10,
    backendResponseStatusCode: 400,
    httpStatus: 'Timeout reading request input',
    ...cfg,
  }

  const timeout = timeoutSeconds * 1000

  return (req, res, next) => {
    // If requestTimeout was previously set - cancel it first
    // Then set the new requestTimeout and handler
    if (req.bodyParserTimeout) clearTimeout(req.bodyParserTimeout)

    req.bodyParserTimeout = setTimeout(() => {
      respondWithError(
        req,
        res,
        new AppError(httpStatus, {
          code,
          backendResponseStatusCode,
          // userFriendly: true, // no, cause this error is not expected
        }),
      )
    }, timeout)

    next()
  }
}

/**
 * Should be called AFTER bodyParser
 */
export function clearBodyParserTimeout(): BackendRequestHandler {
  return (req, _res, next) => {
    clearTimeout(req.bodyParserTimeout)
    next()
  }
}
