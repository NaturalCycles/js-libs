import type { BackendErrorResponseObject, ErrorObject } from '@naturalcycles/js-lib/error'
import { _anyToError, _errorLikeToErrorObject } from '@naturalcycles/js-lib/error'
import type { StringMap } from '@naturalcycles/js-lib/types'
import { _objectAssign } from '@naturalcycles/js-lib/types'
import type { BackendErrorRequestHandler, BackendRequest, BackendResponse } from './server.model.js'

export interface GenericErrorMiddlewareCfg {
  errorReportingService?: ErrorReportingService

  /**
   * Generic hook that can be used to **mutate** errors before they are returned to client.
   * This function does not affect data sent to sentry.
   */
  formatError?: (err: ErrorObject, req: BackendRequest) => void
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

// Headers a handler may have set for the response it never got to send;
// they would wrongly describe the error response (e.g `res.json` keeps a pre-set Content-Type)
const staleResponseHeaders = [
  'Content-Type',
  'Content-Disposition',
  'Content-Encoding',
  'Content-Language',
  'Content-Range',
  'ETag',
  'Last-Modified',
]

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
      req.error({ msg: `error after headersSent:`, err })
    } else {
      req.error({ err })
    }

    // todo: add endpoint to the log
    // todo: add userId from the "Context" (or, just req.userId?) to the log
  }

  if (headersSent) {
    // Too late for an error response. A finished response needs nothing beyond the reporting above.
    // An unfinished one (error mid-stream) is cut off, so the client sees a failed transfer right away
    // instead of waiting for a body that never completes. Same as Express' default error handler.
    if (!res.writableEnded) res.destroy()
    return
  }

  const httpError = _errorLikeToErrorObject(originalError)
  if (!includeErrorStack) delete httpError.stack

  // http-errors (express itself, its body parsers) carry the status they should be answered with
  const httpErrorLike = isHttpError(originalError) ? originalError : undefined
  httpError.data.backendResponseStatusCode ||= httpErrorLike?.statusCode || 500 // default to 500
  _objectAssign(httpError.data, {
    errorId,
    headersSent: headersSent || undefined,
  })

  formatError?.(httpError, req) // Mutates the error

  for (const header of staleResponseHeaders) res.removeHeader(header)
  res.setHeader('Cache-Control', 'no-store')
  if (httpErrorLike?.headers) res.set(httpErrorLike.headers)

  res.status(httpError.data.backendResponseStatusCode).json({
    error: httpError,
  } satisfies BackendErrorResponseObject)
}

interface HttpErrorLike extends Error {
  status: number
  statusCode: number
  expose: boolean
  headers?: StringMap<string>
}

/**
 * Errors created by the `http-errors` package (express itself, body-parser, raw-body, send)
 * describe the response they expect: `status` and `statusCode` (always equal),
 * `expose` (whether the message is safe to show to the client) and optional response `headers`.
 * The first three together are the marker: other libraries also put `statusCode` or `headers`
 * on their errors (e.g a gateway's response), which say nothing about how we should respond.
 */
function isHttpError(err: Error): err is HttpErrorLike {
  const { status, statusCode, expose } = err as Partial<HttpErrorLike>
  if (typeof expose !== 'boolean' || typeof statusCode !== 'number' || status !== statusCode) {
    return false
  }
  return Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599
}
