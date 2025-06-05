import {
  _objectAssign,
  type BackendErrorResponseObject,
  type ErrorObject,
} from '@naturalcycles/js-lib'
import { _anyToError, _errorLikeToErrorObject } from '@naturalcycles/js-lib'
import type { BackendErrorRequestHandler, BackendRequest, BackendResponse } from './server.model.js'

export interface GenericErrorMiddlewareCfg {
  errorReportingService?: ErrorReportingService

  /**
   * Generic hook that can be used to **mutate** errors before they are returned to client.
   * This function does not affect data sent to sentry.
   */
  formatError?: (err: ErrorObject) => void
}

export interface ErrorReportingService {
  /**
   * Call to report an error.
   *
   * It returns an ID for the error (which may be used to reference it later),
   * and may return undefined if the error is not reported.
   * Which may happen if the error is not considered reportable,
   * or if an error reporting rate is configured in the service.
   *
   */
  captureException: (err: any) => string | undefined
}

const { APP_ENV } = process.env
const includeErrorStack = APP_ENV === 'dev'

// Hacky way to store the errorService, so it's available to `respondWithError` function
let errorService: ErrorReportingService | undefined
let formatError: GenericErrorMiddlewareCfg['formatError']

/**
 * Generic error handler.
 * Returns HTTP code based on err.data.backendResponseStatusCode (default to 500).
 * Sends json payload as ErrorResponse, transformed via errorSharedUtil.
 */
export function genericErrorMiddleware(
  cfg: GenericErrorMiddlewareCfg = {},
): BackendErrorRequestHandler {
  errorService ||= cfg.errorReportingService
  formatError = cfg.formatError

  return (err, req, res, _next) => {
    // if (res.headersSent) {
    // Here we don't even log this error
    // It's known that it comes from sentry.requestHandler()
    // requestHandler waits for all promises/timeouts to finish in the request, and then emits this error here,
    // while `res` is the same as was returned to the User (so, both headers and the data was already returned by that time)
    // req.log.warn(`genericErrorHandler, but headersSent=true`, err)
    // Here we don't propagate the error further, cause there's only "default express error logger" behind it
    // and nothing else. Previously it was logging the same error once again because of this. Avoid.
    // return next(err)
    // return next()
    // }

    respondWithError(req, res, err)
  }
}

export function respondWithError(req: BackendRequest, res: BackendResponse, err: any): void {
  const { headersSent } = res

  const originalError = _anyToError(err)

  let errorId: string | undefined
  if (errorService) {
    // captureException logs the error,
    // so we don't need to log it here
    errorId = errorService.captureException(originalError)
  } else {
    // because errorService was not provided - we are going to log the error here

    if (headersSent) {
      req.error(`error after headersSent:`, err)
    } else {
      req.error(err)
    }

    // todo: add endpoint to the log
    // todo: add userId from the "Context" (or, just req.userId?) to the log
  }

  if (headersSent) return

  const httpError = _errorLikeToErrorObject(originalError)
  if (!includeErrorStack) delete httpError.stack

  httpError.data.backendResponseStatusCode ||= 500 // default to 500
  _objectAssign(httpError.data, {
    errorId,
    headersSent: headersSent || undefined,
  })

  formatError?.(httpError) // Mutates

  res.status(httpError.data.backendResponseStatusCode).json({
    error: httpError,
  } satisfies BackendErrorResponseObject)
}
