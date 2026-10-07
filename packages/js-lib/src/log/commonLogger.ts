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
  warn: 30,
  error: 40,
}

/**
 * Structured log data: a message, an error, and any other fields.
 */
export interface LogData {
  msg?: string
  err?: unknown
  [field: string]: unknown
}

/**
 * What a log call accepts: a string is `{ msg }`, an Error is `{ err }`.
 * A non-Error error value (e.g an `unknown` from a catch) is passed as `{ err }`.
 */
export type LogInput = string | Error | LogData

/**
 * What a sink receives: the logger's context, the log data and the level.
 */
export interface LogEntry extends LogData {
  level: CommonLogLevel
}

export type LogSink = (entry: LogEntry) => void

export type CommonLogFunction = (input: LogInput) => void

/**
 * @experimental
 */
export interface CommonLogger {
  debug: CommonLogFunction
  log: CommonLogFunction
  warn: CommonLogFunction
  error: CommonLogFunction
  /**
   * Creates a logger that adds `context` to every entry.
   */
  child: (context: LogData) => CommonLogger
}

/**
 * Creates a CommonLogger that writes every entry to `sink`.
 * `context` is called on every log call, so it can return values that change
 * after the logger is created (e.g a request context whose user is resolved later).
 */
export function commonLoggerCreate(sink: LogSink, context?: () => LogData): CommonLogger {
  const emit = (level: CommonLogLevel, input: LogInput): void =>
    sink({ ...context?.(), ...toLogData(input), level })

  return {
    debug: input => emit('debug', input),
    log: input => emit('log', input),
    warn: input => emit('warn', input),
    error: input => emit('error', input),
    child: childContext => commonLoggerCreate(sink, () => ({ ...context?.(), ...childContext })),
  }
}

function toLogData(input: LogInput): LogData {
  if (typeof input === 'string') return { msg: input }
  if (input instanceof Error) return { err: input }
  return input
}

/**
 * CommonLogger that logs to `console`.
 */
export const consoleLogger: CommonLogger = commonLoggerCreate(({ level, msg, err, ...fields }) => {
  const args: unknown[] = []
  if (msg !== undefined) args.push(msg)
  if (err !== undefined) args.push(err)
  if (Object.keys(fields).length) args.push(fields)
  console[level](...args)
})

/**
 * CommonLogger that does nothing (noop).
 */
export const commonLoggerNoop: CommonLogger = {
  debug: _noop,
  log: _noop,
  warn: _noop,
  error: _noop,
  child: () => commonLoggerNoop,
}

/**
 * Creates a CommonLogger that is "limited" to the specified CommonLogLevel.
 */
export function createCommonLoggerAtLevel(
  logger: CommonLogger = consoleLogger,
  minLevel: CommonLogLevel = 'log',
): CommonLogger {
  const level = commonLogLevelNumber[minLevel]

  if (level <= commonLogLevelNumber['debug']) {
    // All levels are kept
    return logger
  }

  return {
    debug: _noop, // otherwise it is "log everything" logger (same logger as input)
    log: level <= commonLogLevelNumber['log'] ? input => logger.log(input) : _noop,
    warn: level <= commonLogLevelNumber['warn'] ? input => logger.warn(input) : _noop,
    error: input => logger.error(input),
    child: context => createCommonLoggerAtLevel(logger.child(context), minLevel),
  }
}

/**
 * Creates a "proxy" CommonLogger that pipes log entries to all provided sub-loggers.
 */
export function commonLoggerPipe(loggers: CommonLogger[]): CommonLogger {
  return {
    debug: input => loggers.forEach(logger => logger.debug(input)),
    log: input => loggers.forEach(logger => logger.log(input)),
    warn: input => loggers.forEach(logger => logger.warn(input)),
    error: input => loggers.forEach(logger => logger.error(input)),
    child: context => commonLoggerPipe(loggers.map(logger => logger.child(context))),
  }
}
