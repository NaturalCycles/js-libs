import type { HttpMethod, HttpStatusCode } from '../http/http.model.js'
import type { NumberOfMilliseconds } from '../types.js'

/**
 * Extendable payload object to transfer custom additional data with AppError.
 */
export interface ErrorData {
  /**
   * String constant/enum that is specific for certain type of error and never changes.
   * Allows Frontend to deal with certain type of error in a specific way.
   */
  code?: string

  /**
   * If error.message is user-friendly (can be shown to the user "as is").
   *
   * This is a hint to the Client on how it should render the error message.
   * userFriendly true means it can be rendered "as is".
   * userFriendly false (or undefined) means the message is not guaranteed to be user-friendly,
   * so client can resort to more generic "Oops, something went wrong" message.
   */
  userFriendly?: boolean

  /**
   * Error id in some error tracking system (e.g Sentry).
   */
  errorId?: string

  /**
   * If set - provides a short semi-user-friendly error message snippet,
   * that would allow to give a hint to the user what went wrong,
   * also to developers and CS to distinguish between different errors.
   *
   * It's not supposed to have full information about the error, just a small extract from it.
   */
  snippet?: string

  /**
   * Set to true to force reporting this error (e.g to Sentry).
   * Useful to be able to force-report e.g a 4xx error, which by default wouldn't be reported.
   * Set to false to force not-reporting it.
   */
  report?: boolean

  /**
   * Set to true or false to control error reporting on the Client-side.
   * It works as in indication/hint, not a guarantee,
   * because Client-side still need to manually check and respect this property.
   */
  reportClientSide?: boolean

  /**
   * If defined - used by SentrySharedService in backend-lib.
   * Allows to report only X% of errors of this type.
   * E.g 0.1 will report 10% of errors (and ignore the 90%)
   */
  reportRate?: number

  /**
   * Can be used by error-reporting tools (e.g Sentry).
   * If fingerprint is defined - it'll be used INSTEAD of default fingerprint of a tool.
   * Can be used to force-group errors that are NOT needed to be split by endpoint or calling function.
   *
   * Sentry takes string[], but for convenience we allow to pass a singe string.
   */
  fingerprint?: string

  /**
   * Similar to fingerprint, with one important difference.
   *
   * fingerprint means FINAL fingerprint that'll be used for error reporting as is.
   *
   * errorGroup is meant to be used as a COMPONENT to construct a fingerprint, but not
   * an exhaustive fingerprint by itself.
   */
  errorGroup?: string

  /**
   * Set when throwing an error from your backend code, to indicate desired http status code.
   * e.g throw new AppError('oj', { backendResponseStatusCode: 401 })
   */
  backendResponseStatusCode?: HttpStatusCode

  /**
   * Set to true when the error was thrown after response headers were sent.
   */
  headersSent?: boolean

  /**
   * Used in e.g http 401 error.
   */
  adminAuthRequired?: boolean

  /**
   * Used in e.g http 403 error.
   */
  adminPermissionsRequired?: string[]

  /**
   * Open-ended.
   */
  [k: string]: any
}

export interface HttpRequestErrorData extends ErrorData {
  /**
   * Actual `fetch` Response as it was returned.
   * Note that not every Request has a Response, hence it's optional.
   *
   * Non-enumerable.
   */
  response?: Response

  requestUrl: string
  requestBaseUrl?: string
  requestMethod: HttpMethod
  /**
   * Conveniently combines Method and Url, respects `logWithSearchParams` (and similar) configuration.
   * E.g:
   * GET /some/url
   */
  requestSignature: string
  /**
   * FetcherOptions.requestName, if it was provided.
   * Allows to construct errorGroup/fingerprint.
   */
  requestName?: string
  /**
   * Can be set to 0 if request "failed to start" or "failed to reach the server".
   */
  requestDuration: NumberOfMilliseconds
  /**
   * 0 is used for edge cases when e.g it failed to reach the server.
   */
  responseStatusCode: HttpStatusCode
}

/**
 * Sometimes there are cases when Errors come from unexpected places,
 * where err is not instanceof Error, but still looks like Error.
 */
export interface ErrorLike {
  name: string
  message: string
  stack?: string
  data?: any
  cause?: any
}

/**
 * Portable object that represents Error.
 * Has extendable generic `data` property.
 * Can be easily transformed from/to Error class via:
 * - errorObjectToAppError()
 * - appErrorToErrorObject()
 *
 * Cannot contain any properties that stock Error doesn't have, otherwise
 * it will be hard to transform it to ErrorObject.
 * Everything "extra" should go under `data`.
 *
 * Instance of AppError class should satisfy ErrorObject interface.
 */
export interface ErrorObject<DATA_TYPE extends ErrorData = ErrorData> {
  /**
   * Name of the error / error class.
   *
   * @example `Error`
   */
  // Name is removed right now, cause we should not rely on "name"
  // due to "subclassing reasons" (you lose name when you subclass)
  // It's allowed to rely on error.code and error.data.* instead
  // UPD: not anymore. Subclassing issues are fully fixed now (for es2015+ code)
  name: string

  /**
   * Error.message
   */
  message: string

  /**
   * Stacktrace of error, \n-separated, as it comes from Error.stack
   */
  stack?: string

  /**
   * Custom data to be passed with an error. Extendable.
   * It's non-optional, to save some null-checks.
   */
  data: DATA_TYPE

  cause?: ErrorObject
}

/**
 * JSON HTTP response object from the Backend that represents "Error".
 * Assumption is that if JSON response "looks like this" - it's safe to print it in a custom way.
 * Otherwise - it'll be printed in a generic way.
 */
export interface BackendErrorResponseObject<DATA_TYPE extends ErrorData = ErrorData> {
  error: ErrorObject<DATA_TYPE>
}
