import type { CommonLogFunction, Promisable } from '@naturalcycles/js-lib'
import type { Application, IRouter, NextFunction, Request, Response } from 'express'

/**
 * Use this interface instead of express.Request in cases when TypeScript gives an error, because it haven't "included" this very file.
 *
 * It's named like this to avoid clashes with other names.
 * `BackendRequest` seems to not conflict with anything right now.
 * Previous name `ExpressRequest` was clashing with Sentry.
 */
export interface BackendRequest extends Request {
  log: CommonLogFunction
  warn: CommonLogFunction
  error: CommonLogFunction

  requestId?: string
  /**
   * Only used for request logging purposes.
   */
  userId?: string

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
    log: CommonLogFunction
    warn: CommonLogFunction
    error: CommonLogFunction

    requestId?: string

    requestTimeout?: NodeJS.Timeout
    bodyParserTimeout?: NodeJS.Timeout
  }
}
