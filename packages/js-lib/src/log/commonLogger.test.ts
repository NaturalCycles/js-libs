import { expect, test } from 'vitest'
import type { CommonLogger, CommonLogLevel, CommonLogWithLevelFunction } from './commonLogger.js'
import {
  commonLoggerContext,
  commonLoggerCreate,
  commonLoggerNoop,
  commonLoggerPipe,
  commonLoggerPrefix,
  createCommonLoggerAtLevel,
  isLogContext,
  splitLogContext,
} from './commonLogger.js'

// This "tests" that `console` is a valid CommonLogger by itself
const consoleLogger: CommonLogger = console

test('commonLogger', () => {
  consoleLogger.debug('hello')
  consoleLogger.log('hello')
  consoleLogger.error('hello')
})

test('noopLogger', () => {
  const logger = commonLoggerNoop
  logger.debug('hey')
  logger.log('hey')
  logger.error('hey')
})

test('limitCommonLoggerToMinimumLevel', () => {
  const logger = createCommonLoggerAtLevel(console, 'log')
  logger.debug('hey') // should be silent
  logger.log('hey') // verbose
  logger.error('hey') // verbose
})

test('commonLoggerPipe', () => {
  const logger = commonLoggerPipe([console, console])
  logger.log('hey') // should be said twice
})

test('commonLoggerPrefix', () => {
  const logger = commonLoggerPrefix(console, '[mongo]')
  logger.log('hey')
})

test('commonLoggerCreate', () => {
  const fn: CommonLogWithLevelFunction = (level, args) => console[level](...args)

  const logger = commonLoggerCreate(fn)
  logger.debug('hey')
  logger.log('hey')
  logger.error('hey')
})

test('commonLoggerContext appends the context as the last argument on every level', () => {
  const { logger, calls } = createTestSink()
  const contextLogger = commonLoggerContext(logger, { a: 1 })

  contextLogger.log('m', 2)

  expect(calls).toHaveLength(1)
  const [level, args] = calls[0]!
  expect(level).toBe('log')
  expect(args).toHaveLength(3)
  expect(args.slice(0, 2)).toEqual(['m', 2])
  expect(isLogContext(args[2])).toBe(true)
  expect(args[2].a).toBe(1)

  calls.length = 0
  contextLogger.debug('m')
  contextLogger.warn('m')
  contextLogger.error('m')
  expect(calls.map(([level]) => level)).toEqual(['debug', 'warn', 'error'])
  for (const [, args] of calls) {
    expect(args).toHaveLength(2)
    expect(isLogContext(args[1])).toBe(true)
  }
})

test('log context tag is hidden', () => {
  const { logger } = createTestSink()
  const { context } = commonLoggerContext(logger, { a: 1 })

  expect(Object.keys(context)).toEqual(['a'])
  expect(JSON.stringify(context)).toBe('{"a":1}')
  expect(isLogContext({ a: 1 })).toBe(false)
  expect(isLogContext(null)).toBe(false)
  expect(isLogContext(undefined)).toBe(false)
  expect(isLogContext('a')).toBe(false)
})

test('child merges the context, child keys win', () => {
  const { logger, calls } = createTestSink()
  const parent = commonLoggerContext(logger, { a: 1 })
  const child = parent.child({ b: 2, a: 9 })

  expect({ ...child.context }).toEqual({ a: 9, b: 2 })
  expect({ ...child.child({ c: 3 }).context }).toEqual({ a: 9, b: 2, c: 3 })

  parent.log('m')
  expect({ ...calls[0]![1][1] }).toEqual({ a: 1 })
})

test('wrapping a context logger merges instead of nesting', () => {
  const { logger, calls } = createTestSink()
  const contextLogger = commonLoggerContext(commonLoggerContext(logger, { a: 1 }), { c: 3 })

  contextLogger.log('m')

  const [, args] = calls[0]!
  expect(args).toHaveLength(2)
  expect(isLogContext(args[1])).toBe(true)
  expect({ ...args[1] }).toEqual({ a: 1, c: 3 })
})

test('empty context appends nothing', () => {
  const { logger, calls } = createTestSink()

  commonLoggerContext(logger, {}).log('m')

  expect(calls[0]![1]).toEqual(['m'])
})

test('context is frozen', () => {
  const { logger } = createTestSink()
  const { context } = commonLoggerContext(logger, { a: 1 })

  expect(() => {
    context['a'] = 2
  }).toThrow('Cannot assign to read only property')
  expect(context['a']).toBe(1)
})

test('commonLoggerContext composes with commonLoggerPrefix', () => {
  const { logger, calls } = createTestSink()

  commonLoggerContext(commonLoggerPrefix(logger, '[p]'), { a: 1 }).log('m')

  const [, args] = calls[0]!
  expect(args.slice(0, 2)).toEqual(['[p]', 'm'])
  expect(isLogContext(args[2])).toBe(true)
})

test('commonLoggerContext on console', () => {
  const logger = commonLoggerContext(console, { a: 1 })
  logger.debug('hey')
  logger.log('hey')
  logger.error('hey')
})

test('splitLogContext without a context', () => {
  const args = ['m', { a: 1 }]

  const r = splitLogContext(args)

  expect(r.context).toBeUndefined()
  expect(r.args).toEqual(['m', { a: 1 }])
  expect(r.args).not.toBe(args)
  expect(args).toEqual(['m', { a: 1 }])
})

test('splitLogContext separates the context', () => {
  const { logger, calls } = createTestSink()
  commonLoggerContext(logger, { a: 1 }).log('m', 2)
  const args = calls[0]![1]

  const r = splitLogContext(args)

  expect(r.args).toEqual(['m', 2])
  expect({ ...r.context }).toEqual({ a: 1 })
  expect(args).toHaveLength(3)
})

test('splitLogContext merges multiple contexts, later wins', () => {
  const { logger, calls } = createTestSink()
  const ctx1 = commonLoggerContext(logger, { a: 1, b: 1 }).context
  const ctx2 = commonLoggerContext(logger, { b: 2 }).context

  const r = splitLogContext([ctx1, 'm', ctx2])

  expect(r.args).toEqual(['m'])
  expect({ ...r.context }).toEqual({ a: 1, b: 2 })
  expect(calls).toHaveLength(0)
})

function createTestSink(): { logger: CommonLogger; calls: [CommonLogLevel, any[]][] } {
  const calls: [CommonLogLevel, any[]][] = []
  return {
    logger: commonLoggerCreate((level, args) => calls.push([level, args])),
    calls,
  }
}
