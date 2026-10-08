import { expect, test } from 'vitest'
import type { CommonLogger, LogEntry } from './commonLogger.js'
import {
  commonLoggerCreate,
  commonLoggerNoop,
  commonLoggerPipe,
  consoleLogger,
  createCommonLoggerAtLevel,
} from './commonLogger.js'

test('should accept a string, an Error or structured data', () => {
  const { logger, entries } = createTestLogger()
  const err = new Error('kaboom')

  logger.log('hey')
  logger.error(err)
  logger.debug({ structured: 'data' })
  logger.warn({ msg: 'hey', err, n: 1 })

  expect(entries).toStrictEqual([
    { msg: 'hey', level: 'log' },
    { err, level: 'error' },
    { structured: 'data', level: 'debug' },
    { msg: 'hey', err, n: 1, level: 'warn' },
  ])
})

test('should merge the data into a message, the message wins', () => {
  const { logger, entries } = createTestLogger()
  const err = new Error('kaboom')

  logger.warn('failed', { err, attempt: 2 })
  logger.log('hey', { msg: 'ignored' })

  expect(entries).toStrictEqual([
    { err, attempt: 2, msg: 'failed', level: 'warn' },
    { msg: 'hey', level: 'log' },
  ])
})

test('should add the context to every entry', () => {
  const { logger, entries } = createTestLogger(() => ({ a: 1 }))

  logger.debug('hey')
  logger.log({ structured: 'data' })

  expect(entries).toStrictEqual([
    { a: 1, msg: 'hey', level: 'debug' },
    { a: 1, structured: 'data', level: 'log' },
  ])
})

test('should call the context function on every log call', () => {
  const context: { accountId?: string } = {}
  const { logger, entries } = createTestLogger(() => context)

  logger.log('before')
  context.accountId = 'a1'
  logger.log('after')

  expect(entries).toStrictEqual([
    { msg: 'before', level: 'log' },
    { accountId: 'a1', msg: 'after', level: 'log' },
  ])
})

test('should merge the child context, child and log data keys win', () => {
  const { logger, entries } = createTestLogger(() => ({ a: 1, b: 1, c: 1 }))

  logger.child({ b: 2, c: 2 }).child({ c: 3 }).log({ msg: 'foo', c: 4 })

  expect(entries).toStrictEqual([{ a: 1, b: 2, c: 4, msg: 'foo', level: 'log' }])
})

test('should let the methods be passed around unbound', () => {
  const { logger, entries } = createTestLogger()
  const { error } = logger

  error('hey')

  expect(entries).toStrictEqual([{ msg: 'hey', level: 'error' }])
})

test('should log to console', () => {
  consoleLogger.log('hey')
  consoleLogger.warn({ msg: 'hey', n: 1 })
  consoleLogger.error(new Error('kaboom'))
  consoleLogger.child({ module: 'test' }).log('hey')
})

test('should do nothing in the noop logger', () => {
  commonLoggerNoop.log('hey')
  commonLoggerNoop.child({ a: 1 }).error('hey')
})

test('should limit the logger to the minimum level', () => {
  const { logger, entries } = createTestLogger()
  const atLevel = createCommonLoggerAtLevel(logger, 'log')

  atLevel.debug('hey')
  atLevel.log('hey')
  atLevel.child({ a: 1 }).debug('hey')
  atLevel.child({ a: 1 }).error('hey', { b: 2 })

  expect(entries).toStrictEqual([
    { msg: 'hey', level: 'log' },
    { a: 1, b: 2, msg: 'hey', level: 'error' },
  ])
})

test.each([
  ['warn', ['warn', 'error']],
  ['error', ['error']],
] as const)('should drop the levels below %s', (minLevel, kept) => {
  const { logger, entries } = createTestLogger()
  const atLevel = createCommonLoggerAtLevel(logger, minLevel)

  atLevel.debug('hey')
  atLevel.log('hey')
  atLevel.warn('hey')
  atLevel.error('hey')

  expect(entries.map(entry => entry.level)).toStrictEqual(kept)
})

test('should pipe to all loggers', () => {
  const first = createTestLogger()
  const second = createTestLogger()

  commonLoggerPipe([first.logger, second.logger]).child({ a: 1 }).log('hey', { b: 2 })

  expect(first.entries).toStrictEqual([{ a: 1, b: 2, msg: 'hey', level: 'log' }])
  expect(second.entries).toStrictEqual(first.entries)
})

function createTestLogger(context?: () => Record<string, unknown>): {
  logger: CommonLogger
  entries: LogEntry[]
} {
  const entries: LogEntry[] = []
  return { logger: commonLoggerCreate(entry => entries.push(entry), context), entries }
}
