import { isServerSide } from '../env.js'
import { _jsonParseIfPossible } from '../string/json.util.js'
import { _truncate, _truncateMiddle } from '../string/string.util.js'
import { _stringify } from '../string/stringify.js'
import type { Class } from '../types.js'
import type {
  BackendErrorResponseObject,
  ErrorData,
  ErrorLike,
  ErrorObject,
  HttpRequestErrorData,
} from './error.model.js'

/**
 * Useful to ensure that error in `catch (err) { ... }`
 * is indeed an Error (and not e.g `string` or `undefined`).
 * 99% of the cases it will be Error already.
 * Becomes more useful since TypeScript 4.4 made `err` of type `unknown` by default.
 *
 * Alternatively, if you're sure it's Error - you can use `_assertIsError(err)`.
 */
export function _anyToError<ERROR_TYPE extends Error = Error>(
  o: any,
  errorClass: Class<ERROR_TYPE> = Error as any,
  errorData?: ErrorData,
): ERROR_TYPE {
  let e: ERROR_TYPE

  if (o instanceof errorClass) {
    e = o
  } else {
    // If it's an instance of Error, but ErrorClass is something else (e.g AppError) - it'll be "repacked" into AppError

    const errorObject = _anyToErrorObject(o)
    e = _errorObjectToError(errorObject, errorClass)
  }

  if (errorData) {
    ;(e as any).data = {
      ...(e as any).data,
      ...errorData,
    }
  }

  return e
}

/**
 * Converts "anything" to ErrorObject.
 * Detects if it's HttpErrorResponse, HttpErrorObject, ErrorObject, Error, etc..
 * If object is Error - Error.message will be used.
 * Objects (not Errors) get converted to prettified JSON string (via `_stringify`).
 */
export function _anyToErrorObject<DATA_TYPE extends ErrorData = ErrorData>(
  o: any,
  errorData?: Partial<DATA_TYPE>,
): ErrorObject<DATA_TYPE> {
  let eo: ErrorObject<DATA_TYPE>

  if (_isErrorLike(o)) {
    eo = _errorLikeToErrorObject(o)
  } else {
    o = _jsonParseIfPossible(o)

    if (_isBackendErrorResponseObject(o)) {
      eo = o.error as ErrorObject<DATA_TYPE>
    } else if (_isErrorObject(o)) {
      eo = o as ErrorObject<DATA_TYPE>
    } else if (_isErrorLike(o)) {
      eo = _errorLikeToErrorObject(o)
    } else {
      // Here we are sure it has no `data` property,
      // so, fair to return `data: {}` in the end
      // Also we're sure it includes no "error name", e.g no `Error: ...`,
      // so, fair to include `name: 'Error'`
      const message = _stringify(o)

      eo = {
        name: 'Error',
        message,
        data: {} as DATA_TYPE, // empty
      }
    }
  }

  Object.assign(eo.data, errorData)
  return eo
}

export function _errorLikeToErrorObject<DATA_TYPE extends ErrorData = ErrorData>(
  e: AppError<DATA_TYPE> | Error | ErrorLike,
): ErrorObject<DATA_TYPE> {
  // If it's already an ErrorObject - just return it
  // AppError satisfies ErrorObject interface
  // Error does not satisfy (lacks `data`)
  // UPD: no, we expect a "plain object" here as an output,
  // because Error classes sometimes have non-enumerable properties (e.g data)
  if (!(e instanceof Error) && _isErrorObject(e)) {
    return e as ErrorObject<DATA_TYPE>
  }

  const obj: ErrorObject<DATA_TYPE> = {
    name: e.name,
    message: e.message,
    data: { ...(e as any).data }, // empty by default
  }

  if (e.stack) obj.stack = e.stack

  if (e.cause) {
    obj.cause = _anyToErrorObject(e.cause)
  }

  return obj
}

export function _errorObjectToError<DATA_TYPE extends ErrorData, ERROR_TYPE extends Error>(
  o: ErrorObject<DATA_TYPE>,
  errorClass: Class<ERROR_TYPE> = Error as any,
): ERROR_TYPE {
  if (o instanceof errorClass) return o

  // Here we pass constructor values assuming it's AppError or sub-class of it
  // If not - will be checked at the next step
  // We cannot check `if (errorClass instanceof AppError)`, only `err instanceof AppError`
  const { name, cause } = o
  const err = new errorClass(o.message, o.data, { name, cause })
  // name: err.name, // cannot be assigned to a readonly property like this
  // stack: o.stack, // also readonly e.g in Firefox

  if (o.stack) {
    Object.defineProperty(err, 'stack', {
      value: o.stack,
    })
  }

  if (!(err instanceof AppError)) {
    // Following actions are only needed for non-AppError-like errors

    Object.defineProperties(err, {
      name: {
        value: name,
        configurable: true,
        writable: true,
      },
      data: {
        value: o.data,
        writable: true,
        configurable: true,
        enumerable: false,
      },
      cause: {
        value: cause,
        writable: true,
        configurable: true,
        enumerable: true,
      },
    })

    Object.defineProperty(err.constructor, 'name', {
      value: name,
      configurable: true,
      writable: true,
    })
  }

  return err
}

export interface ErrorSnippetOptions {
  /**
   * Max length of the error line.
   * Snippet may have multiple lines, one original and one per `cause`.
   */
  maxLineLength?: number

  maxLines?: number
}

// These "common" error classes will not be printed as part of the Error snippet
const commonErrorClasses = new Set([
  'Error',
  'AppError',
  'AssertionError',
  'HttpRequestError',
  'JoiValidationError',
])

/**
 * Provides a short semi-user-friendly error message snippet,
 * that would allow to give a hint to the user what went wrong,
 * also to developers and CS to distinguish between different errors.
 *
 * It's not supposed to have full information about the error, just a small extract from it.
 */
export function _errorSnippet(err: any, opt: ErrorSnippetOptions = {}): string {
  const { maxLineLength = 60, maxLines = 3 } = opt
  const e = _anyToErrorObject(err)

  const lines = [errorObjectToSnippet(e)]

  let { cause } = e

  while (cause && lines.length < maxLines) {
    lines.push('Caused by ' + errorObjectToSnippet(cause))
    cause = cause.cause // insert DiCaprio Inception meme
  }

  return lines.map(line => _truncate(line, maxLineLength)).join('\n')

  function errorObjectToSnippet(e: ErrorObject): string {
    // Return snippet if it was already prepared
    if (e.data.snippet) return e.data.snippet

    // Code already serves the purpose of the snippet, so we can just return it
    if (e.data.code) return e.data.code

    return [
      !commonErrorClasses.has(e.name) && e.name,
      // replace "1+ white space characters" with a single space
      e.message.replaceAll(/\s+/gm, ' ').trim(),
    ]
      .filter(Boolean)
      .join(': ')
  }
}

export function _isBackendErrorResponseObject(o: any): o is BackendErrorResponseObject {
  return _isErrorObject(o?.error)
}

export function _isHttpRequestErrorObject(o: any): o is ErrorObject<HttpRequestErrorData> {
  return !!o && o.name === 'HttpRequestError' && typeof o.data?.requestUrl === 'string'
}

/**
 * Note: any instance of AppError is also automatically an ErrorObject
 */
export function _isErrorObject<DATA_TYPE extends ErrorData = ErrorData>(
  o: any,
): o is ErrorObject<DATA_TYPE> {
  return (
    !!o &&
    typeof o === 'object' &&
    typeof o.name === 'string' &&
    typeof o.message === 'string' &&
    typeof o.data === 'object'
  )
}

export function _isErrorLike(o: any): o is ErrorLike {
  return !!o && typeof o === 'object' && typeof o.name === 'string' && typeof o.message === 'string'
}

/**
 * Convenience function to safely add properties to Error's `data` object
 * (even if it wasn't previously existing).
 * Mutates err.
 * Returns err for convenience, so you can re-throw it directly.
 *
 * @example
 *
 * try {} catch (err) {
 *   throw _errorDataAppend(err, {
 *     backendResponseStatusCode: 401,
 *   })
 * }
 */
export function _errorDataAppend<ERR>(err: ERR, data?: ErrorData): ERR {
  if (!data) return err
  ;(err as any).data ||= {} // create err.data if it doesn't exist
  // Using Object.assign instead of ...data to not override err.data's non-enumerable properties
  Object.assign((err as any).data, data)
  return err
}

export interface AppErrorComponents<DATA_TYPE extends ErrorData = ErrorData> {
  message: string
  name?: string
  data?: DATA_TYPE
  cause?: any
}

/**
 * Extra options for AppError constructor.
 */
export interface AppErrorOptions {
  /**
   * Overrides Error.name and Error.constructor.name
   */
  name?: string

  /**
   * Sets Error.cause.
   * It is transformed with _anyToErrorObject()
   */
  cause?: any
}

/**
 * Base class for all our (not system) errors.
 *
 * message - "technical" message. Frontend decides to show it or not.
 * data - optional "any" payload.
 * data.userFriendly - if present, will be displayed to the User as is.
 *
 * Based on: https://medium.com/@xpl/javascript-deriving-from-error-properly-8d2f8f315801
 */
export class AppError<DATA_TYPE extends ErrorData = ErrorData> extends Error {
  data!: DATA_TYPE

  /**
   * `cause` here is normalized to be an ErrorObject
   */
  override cause?: ErrorObject

  /**
   * Experimental alternative static constructor.
   */
  static of<DATA_TYPE extends ErrorData = ErrorData>(opt: AppErrorComponents): AppError<DATA_TYPE> {
    return new AppError<DATA_TYPE>(opt.message, opt.data as DATA_TYPE, {
      name: opt.name,
      cause: opt.cause,
    })
  }

  constructor(message: string, data = {} as DATA_TYPE, opt: AppErrorOptions = {}) {
    super(message)
    // Here we default to `this.constructor.name` on Node, but to 'AppError' on the Frontend
    // because Frontend tends to minify class names, so `constructor.name` is not reliable
    const { name = isServerSide() ? this.constructor.name : 'AppError', cause } = opt

    Object.defineProperties(this, {
      name: {
        value: name,
        configurable: true,
        writable: true,
      },
      data: {
        value: data,
        writable: true,
        configurable: true,
        enumerable: false,
      },
    })

    if (cause) {
      Object.defineProperty(this, 'cause', {
        value: _anyToErrorObject(cause),
        writable: true,
        configurable: true,
        enumerable: true, // unlike standard - setting it to true for "visibility"
      })
    } else {
      delete this.cause // otherwise it's printed as `cause: undefined`
    }

    // this is to allow changing this.constuctor.name to a non-minified version
    Object.defineProperty(this.constructor, 'name', {
      value: name,
      configurable: true,
      writable: true,
    })

    // todo: check if it's needed at all!
    // if (Error.captureStackTrace) {
    //   Error.captureStackTrace(this, this.constructor)
    // } else {
    //   Object.defineProperty(this, 'stack', {
    //     value: new Error().stack, // eslint-disable-line unicorn/error-message
    //     writable: true,
    //     configurable: true,
    //   })
    // }
  }
}

/**
 * Error that is thrown when Http Request was made and returned an error.
 * Thrown by, for example, Fetcher.
 *
 * On the Frontend this Error class represents the error when calling the API,
 * contains all the necessary request and response information.
 *
 * On the Backend, similarly, it represents the error when calling some 3rd-party API
 * (backend-to-backend call).
 * On the Backend it often propagates all the way to the Backend error handler,
 * where it would be wrapped in BackendErrorResponseObject.
 *
 * Please note that `ErrorData.backendResponseStatusCode` is NOT exactly the same as
 * `HttpRequestErrorData.responseStatusCode`.
 * E.g 3rd-party call may return 401, but our Backend will still wrap it into an 500 error
 * (by default).
 */
export class HttpRequestError extends AppError<HttpRequestErrorData> {
  constructor(message: string, data: HttpRequestErrorData, opt?: AppErrorOptions) {
    if (data.response) {
      Object.defineProperty(data, 'response', {
        enumerable: false,
      })
    }

    super(message, data, { ...opt, name: 'HttpRequestError' })
  }

  /**
   * Cause is strictly-defined for HttpRequestError,
   * so it always has a cause.
   * (for dev convenience)
   */
  declare cause: ErrorObject
}

export class AssertionError extends AppError {
  constructor(message: string, data?: ErrorData) {
    super(message, data, { name: 'AssertionError' })
  }
}

export interface JsonParseErrorData extends ErrorData {
  /**
   * Original text that failed to get parsed.
   */
  text?: string
}

export class JsonParseError extends AppError<JsonParseErrorData> {
  constructor(data: JsonParseErrorData) {
    const message = ['Failed to parse', data.text && _truncateMiddle(data.text, 200)]
      .filter(Boolean)
      .join(': ')

    super(message, data, { name: 'JsonParseError' })
  }
}

export class TimeoutError extends AppError {
  constructor(message: string, data?: ErrorData, opt?: AppErrorOptions) {
    super(message, data, { ...opt, name: 'TimeoutError' })
  }
}

/**
 * It is thrown when Error was expected, but didn't happen
 * ("pass" happened instead).
 * "Pass" means "no error".
 */
export class UnexpectedPassError extends AppError {
  constructor(message?: string) {
    super(
      message || 'expected error was not thrown',
      {},
      {
        name: 'UnexpectedPassError',
      },
    )
  }
}
