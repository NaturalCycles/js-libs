import { _isPlainObject } from '../is.util.js'
import type { AnyObject, MutateOptions } from '../types.js'

// copy-pasted to avoid weird circular dependency
const _noop = (..._args: any[]): undefined => undefined

/**
 * These levels follow console.* naming,
 * so you can use console[level] safely.
 *
 * `debug` is not enabled by default, and is useful when debugging is needed.
 *
 * `log` is considered default level, and is enabled by default.
 *
 * `warn` is for warnings - things that are not super-severe to be an error, but should not happen
 *
 * `error` level would only log errors
 *
 * @experimental
 */
export type CommonLogLevel = 'debug' | 'log' | 'warn' | 'error'

export const commonLogLevelNumber: Record<CommonLogLevel, number> = {
  debug: 10,
  log: 20,
  warn: 20,
  error: 30,
}

/**
 * Function that takes any number of arguments and logs them all.
 * It is expected that logged arguments are separated by "space", like console.log does.
 *
 * @experimental
 */
export type CommonLogFunction = (...args: any[]) => void
export type CommonLogWithLevelFunction = (level: CommonLogLevel, args: any[]) => void

/**
 * Interface is inspired/compatible with `console.*`
 * So, `console` is a valid CommonLogger implementation as-is.
 *
 * @experimental
 */
export interface CommonLogger {
  debug: CommonLogFunction
  log: CommonLogFunction
  warn: CommonLogFunction
  error: CommonLogFunction
}

/**
 * SimpleLogger that does nothing (noop).
 */
export const commonLoggerNoop: CommonLogger = {
  debug: _noop,
  log: _noop,
  warn: _noop,
  error: _noop,
}

/**
 * Creates a "child" logger that is "limited" to the specified CommonLogLevel.
 */
export function createCommonLoggerAtLevel(
  logger: CommonLogger = console,
  minLevel: CommonLogLevel = 'log',
  opt: MutateOptions = {},
): CommonLogger {
  const level = commonLogLevelNumber[minLevel]
  if (opt.mutate) {
    if (level > commonLogLevelNumber['debug']) {
      logger.debug = _noop
      if (level > commonLogLevelNumber['log']) {
        logger.log = _noop
        if (level > commonLogLevelNumber['warn']) {
          logger.warn = _noop
          if (level > commonLogLevelNumber['error']) {
            logger.error = _noop
          }
        }
      }
    }
    return logger
  }

  if (level <= commonLogLevelNumber['debug']) {
    // All levels are kept
    return logger
  }

  if (level > commonLogLevelNumber['error']) {
    // "Log nothing" logger
    return commonLoggerNoop
  }

  return {
    debug: _noop, // otherwise it is "log everything" logger (same logger as input)
    log: level <= commonLogLevelNumber['log'] ? logger.log.bind(logger) : _noop,
    warn: level <= commonLogLevelNumber['warn'] ? logger.warn.bind(logger) : _noop,
    error: logger.error.bind(logger), // otherwise it's "log nothing" logger (same as noopLogger)
  }
}

/**
 * Creates a "proxy" CommonLogger that pipes log messages to all provided sub-loggers.
 */
export function commonLoggerPipe(loggers: CommonLogger[]): CommonLogger {
  return {
    debug: (...args) => loggers.forEach(logger => logger.debug(...args)),
    log: (...args) => loggers.forEach(logger => logger.log(...args)),
    warn: (...args) => loggers.forEach(logger => logger.warn(...args)),
    error: (...args) => loggers.forEach(logger => logger.error(...args)),
  }
}

/**
 * Creates a "child" CommonLogger with prefix (one or multiple).
 */
export function commonLoggerPrefix(logger: CommonLogger, ...prefixes: any[]): CommonLogger {
  return {
    debug: (...args) => logger.debug(...prefixes, ...args),
    log: (...args) => logger.log(...prefixes, ...args),
    warn: (...args) => logger.warn(...prefixes, ...args),
    error: (...args) => logger.error(...prefixes, ...args),
  }
}

export type CommonLogSink = CommonLogger | CommonLogWithLevelFunction

/**
 * A plain object is copied once, at creation.
 * A function is called on every log call, for context that changes after the logger is created
 * (e.g a request context whose user is resolved later).
 */
export type CommonLogContext = AnyObject | (() => AnyObject)

export interface CommonLoggerWithContext extends CommonLogger {
  child: (context: CommonLogContext) => CommonLoggerWithContext
}

/**
 * Creates a CommonLogger from a single function that takes `level` and `args`.
 *
 * With a context, every call emits one object: plain-object args merged in, first Error as `err`,
 * the rest joined into `msg`.
 */
export function commonLoggerCreate(sink: CommonLogSink): CommonLogger
export function commonLoggerCreate(
  sink: CommonLogSink,
  context: CommonLogContext,
): CommonLoggerWithContext
export function commonLoggerCreate(sink: CommonLogSink, context?: CommonLogContext): CommonLogger {
  const fn: CommonLogWithLevelFunction =
    typeof sink === 'function' ? sink : (level, args) => sink[level](...args)

  if (!context) {
    return {
      debug: (...args) => fn('debug', args),
      log: (...args) => fn('log', args),
      warn: (...args) => fn('warn', args),
      error: (...args) => fn('error', args),
    }
  }

  const getContext = typeof context === 'function' ? context : constant({ ...context })

  const logger: CommonLoggerWithContext = {
    debug: (...args) => fn('debug', [toLogEntry(getContext(), args)]),
    log: (...args) => fn('log', [toLogEntry(getContext(), args)]),
    warn: (...args) => fn('warn', [toLogEntry(getContext(), args)]),
    error: (...args) => fn('error', [toLogEntry(getContext(), args)]),
    child: c => commonLoggerCreate(fn, mergeContexts(context, c)),
  }
  return logger
}

function mergeContexts(parent: CommonLogContext, child: CommonLogContext): CommonLogContext {
  if (typeof parent !== 'function' && typeof child !== 'function') {
    return { ...parent, ...child }
  }
  const getParent = typeof parent === 'function' ? parent : constant(parent)
  const getChild = typeof child === 'function' ? child : constant(child)
  return () => ({ ...getParent(), ...getChild() })
}

function constant(obj: AnyObject): () => AnyObject {
  return () => obj
}

function toLogEntry(context: AnyObject, args: any[]): AnyObject {
  const entry: AnyObject = { ...context }
  let err: Error | undefined
  let msg: string | undefined

  for (const arg of args) {
    if (_isPlainObject(arg)) {
      Object.assign(entry, arg)
    } else if (!err && arg instanceof Error) {
      err = arg
    } else {
      const s = String(arg)
      msg = msg === undefined ? s : `${msg} ${s}`
    }
  }

  if (err) entry['err'] = err
  if (msg !== undefined) entry['msg'] = msg
  return entry
}
