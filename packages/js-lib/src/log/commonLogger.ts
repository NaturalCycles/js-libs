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

/**
 * Creates a CommonLogger from a single function that takes `level` and `args`.
 */
export function commonLoggerCreate(fn: CommonLogWithLevelFunction): CommonLogger {
  return {
    debug: (...args) => fn('debug', args),
    log: (...args) => fn('log', args),
    warn: (...args) => fn('warn', args),
    error: (...args) => fn('error', args),
  }
}

// tagged as a non-enumerable own property, so the tag never shows up
// in Object.keys / JSON.stringify / inspect output.
// Symbol.for, so it survives duplicate copies of js-lib in node_modules.
const LOG_CONTEXT: unique symbol = Symbol.for('@naturalcycles/js-lib/logContext')
const LOGGER_BASE: unique symbol = Symbol.for('@naturalcycles/js-lib/logContextBase')

/**
 * Object of structured log fields, tagged so that log sinks can recognize it.
 *
 * @experimental
 */
export type LogContext = AnyObject & { readonly [LOG_CONTEXT]: true }

/**
 * CommonLogger that carries a context object.
 *
 * @experimental
 */
export interface CommonLoggerWithContext extends CommonLogger {
  readonly context: AnyObject
  child: (context: AnyObject) => CommonLoggerWithContext
}

/**
 * Creates a "child" CommonLogger that appends the given context as the LAST argument
 * of every log call, tagged as a LogContext.
 *
 * Sinks that know the tag (via splitLogContext) can lift its fields into a structured
 * log entry, `console` simply prints the object after the message.
 *
 * Contexts merge instead of nesting: wrapping a context logger (or calling `child`)
 * produces a logger that still appends exactly one context object, where the new keys win.
 *
 * @experimental
 */
export function commonLoggerContext(
  logger: CommonLogger,
  context: AnyObject,
): CommonLoggerWithContext {
  const parent = (logger as any)[LOGGER_BASE] as CommonLogger | undefined
  const base = parent ?? logger
  const ctx: AnyObject = parent
    ? { ...(logger as CommonLoggerWithContext).context, ...context }
    : { ...context }
  Object.defineProperty(ctx, LOG_CONTEXT, { value: true })
  Object.freeze(ctx)

  const empty = !Object.keys(ctx).length

  const contextLogger: CommonLoggerWithContext = {
    context: ctx,
    child: c => commonLoggerContext(base, { ...ctx, ...c }),
    debug: empty ? base.debug.bind(base) : (...args) => base.debug(...args, ctx),
    log: empty ? base.log.bind(base) : (...args) => base.log(...args, ctx),
    warn: empty ? base.warn.bind(base) : (...args) => base.warn(...args, ctx),
    error: empty ? base.error.bind(base) : (...args) => base.error(...args, ctx),
  }
  Object.defineProperty(contextLogger, LOGGER_BASE, { value: base })
  return contextLogger
}

/**
 * Separates the LogContext arguments (as appended by commonLoggerContext) from the rest.
 * Multiple contexts are merged, later ones win. Input args are not mutated.
 *
 * @experimental
 */
export function splitLogContext(args: any[]): { context: AnyObject | undefined; args: any[] } {
  let context: AnyObject | undefined
  const rest: any[] = []
  for (const arg of args) {
    if (isLogContext(arg)) {
      context = context ? { ...context, ...arg } : arg
    } else {
      rest.push(arg)
    }
  }
  return { context, args: rest }
}

/**
 * Returns true if the value is a LogContext, as created by commonLoggerContext.
 *
 * @experimental
 */
export function isLogContext(value: unknown): value is LogContext {
  return typeof value === 'object' && value !== null && (value as any)[LOG_CONTEXT] === true
}
