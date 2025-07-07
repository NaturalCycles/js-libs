// copy-pasted to avoid weird circular dependency
import type { MutateOptions } from '../array/array.util.js'

const _noop = (..._args: any[]): undefined => undefined

/**
 * These levels follow console.* naming,
 * so you can use console[level] safely.
 *
 * `log` is considered default level.
 *
 * For simplicity - only these 3 levels are kept.
 *
 * @experimental
 */
export type CommonLogLevel = 'log' | 'warn' | 'error'

export const commonLogLevelNumber: Record<CommonLogLevel, number> = {
  log: 10,
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
  log: CommonLogFunction
  warn: CommonLogFunction
  error: CommonLogFunction
}

/**
 * SimpleLogger that does nothing (noop).
 *
 * @experimental
 */
export const commonLoggerNoop: CommonLogger = {
  log: _noop,
  warn: _noop,
  error: _noop,
}

/**
 * Creates a "child" logger that is "limited" to the specified CommonLogLevel.
 */
export function commonLoggerMinLevel(
  logger: CommonLogger,
  minLevel: CommonLogLevel,
  opt: MutateOptions = {},
): CommonLogger {
  const level = commonLogLevelNumber[minLevel]
  if (opt.mutate) {
    if (level > commonLogLevelNumber['log']) {
      logger.log = _noop
      if (level > commonLogLevelNumber['warn']) {
        logger.warn = _noop
        if (level > commonLogLevelNumber['error']) {
          logger.error = _noop
        }
      }
    }
    return logger
  }

  if (level <= commonLogLevelNumber['log']) {
    // All levels are kept
    return logger
  }

  if (level > commonLogLevelNumber['error']) {
    // "Log nothing" logger
    return commonLoggerNoop
  }

  return {
    log: _noop, // otherwise it is "log everything" logger (same logger as input)
    warn: level <= commonLogLevelNumber['warn'] ? logger.warn.bind(logger) : _noop,
    error: logger.error.bind(logger), // otherwise it's "log nothing" logger (same as noopLogger)
  }
}

/**
 * Creates a "proxy" CommonLogger that pipes log messages to all provided sub-loggers.
 */
export function commonLoggerPipe(loggers: CommonLogger[]): CommonLogger {
  return {
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
    log: (...args) => fn('log', args),
    warn: (...args) => fn('warn', args),
    error: (...args) => fn('error', args),
  }
}
