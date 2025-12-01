import type { CommonLogFunction } from '@naturalcycles/js-lib/log'
import type { Promisable } from '@naturalcycles/js-lib/types'
import type { Application, IRouter, NextFunction, Request, Response } from 'express'

/**
 * Use this interface instead of express.Request in cases when TypeScript gives an error, because it haven't "included" this very file.
 *
 * It's named like this to avoid clashes with other names.
 * `BackendRequest` seems to not conflict with anything right now.
 * Previous name `ExpressRequest` was clashing with Sentry.
 */
export interface BackendRequest<BODY = unknown> extends Request {
  debug: CommonLogFunction
  log: CommonLogFunction
  warn: CommonLogFunction
  error: CommonLogFunction

  requestId?: string
  /**
   * Only used for request logging purposes.
   */
  userId?: string

  /**
   * It defaults to unknown (instead of `any`) to prevent implicit use of any
   * in unexpected places.
   */
  body: BODY

  /**
   * Raw Buffer of the `req.body`, before it's stringified and json-parsed.
   * Useful for when something mutates `req.body` json (e.g j validation), and you
   * want access to the original input.
   *
   * For `req.rawBody` to exist - you need to use `createDefaultApp`, or use the
   * `verify` option of the json parser (copy-paste it from `createDefaultApp`).
   */
  rawBody?: Buffer

  /**
   * Set by requestTimeoutMiddleware.
   * Can be used to cancel/override the timeout.
   */
  requestTimeout?: NodeJS.Timeout

  bodyParserTimeout?: NodeJS.Timeout
}

export type BackendResponse = Response

export type BackendRequestHandler = (
  req: BackendRequest,
  res: BackendResponse,
  next: NextFunction,
) => Promisable<any>

export type BackendErrorRequestHandler = (
  err: any,
  req: BackendRequest,
  res: BackendResponse,
  next: NextFunction,
) => Promisable<any>

export type BackendRouter = IRouter
export type BackendApplication = Application

declare module 'http' {
  interface IncomingMessage {
    debug: CommonLogFunction
    log: CommonLogFunction
    warn: CommonLogFunction
    error: CommonLogFunction

    requestId?: string

    requestTimeout?: NodeJS.Timeout
    bodyParserTimeout?: NodeJS.Timeout
  }
}
