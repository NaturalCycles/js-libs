import type { MutateOptions } from '../array/array.util.js'

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
