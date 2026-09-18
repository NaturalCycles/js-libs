import { expect, test } from 'vitest'
import type { AnyObject } from '../types.js'
import type { CommonLogger, CommonLogLevel, CommonLogWithLevelFunction } from './commonLogger.js'
import {
  commonLoggerCreate,
  commonLoggerNoop,
  commonLoggerPipe,
  commonLoggerPrefix,
  createCommonLoggerAtLevel,
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

test('commonLoggerCreate accepts a CommonLogger as a sink', () => {
  const { logger, calls } = createTestSink()

  commonLoggerCreate(logger).log('a', 1)

  expect(calls).toStrictEqual([['log', ['a', 1]]])
})

test('a context makes every call emit a single object', () => {
  const { logger, calls } = createTestSink()
  const contextLogger = commonLoggerCreate(logger, { a: 1 })

  contextLogger.debug('hey')
  contextLogger.log('hey')
  contextLogger.warn('hey')
  contextLogger.error('hey')

  expect(calls).toStrictEqual([
    ['debug', [{ a: 1, msg: 'hey' }]],
    ['log', [{ a: 1, msg: 'hey' }]],
    ['warn', [{ a: 1, msg: 'hey' }]],
    ['error', [{ a: 1, msg: 'hey' }]],
  ])
})

test('child merges the context, child keys win', () => {
  const { logger, calls } = createTestSink()
  const parent = commonLoggerCreate(logger, { a: 1 })
  const child = parent.child({ b: 2, a: 9 })

  child.debug('foo')
  parent.debug('foo')
  child.child({ c: 3 }).debug('foo')

  expect(calls).toStrictEqual([
    ['debug', [{ a: 9, b: 2, msg: 'foo' }]],
    ['debug', [{ a: 1, msg: 'foo' }]],
    ['debug', [{ a: 9, b: 2, c: 3, msg: 'foo' }]],
  ])
})

test('a plain object argument is merged in, without a msg', () => {
  const { logger, calls } = createTestSink()

  commonLoggerCreate(logger, { a: 1 }).debug({ structured: 'data' })

  expect(calls[0]![1]).toStrictEqual([{ a: 1, structured: 'data' }])
})

test('non-object arguments are joined into msg', () => {
  const { logger, calls } = createTestSink()
  const contextLogger = commonLoggerCreate(logger, { a: 1 })

  contextLogger.warn('hello', { n: 1 }, 2)
  contextLogger.log([1, 2])

  expect(calls[0]![1]).toStrictEqual([{ a: 1, n: 1, msg: 'hello 2' }])
  expect(calls[1]![1]).toStrictEqual([{ a: 1, msg: '1,2' }])
})

test('an argument wins over the context', () => {
  const { logger, calls } = createTestSink()

  commonLoggerCreate(logger, { a: 1 }).log({ a: 9 })

  expect(calls[0]![1]).toStrictEqual([{ a: 9 }])
})

test('the first Error argument becomes err', () => {
  const { logger, calls } = createTestSink()
  const contextLogger = commonLoggerCreate(logger, { a: 1 })
  const err = new Error('boom')

  contextLogger.error(err)
  contextLogger.error('failed', err)
  contextLogger.error(err, new Error('second'))

  expect(calls[0]![1]).toStrictEqual([{ a: 1, err }])
  expect(calls[0]![1][0].err).toBe(err)
  expect(calls[1]![1]).toStrictEqual([{ a: 1, err, msg: 'failed' }])
  expect(calls[2]![1]).toStrictEqual([{ a: 1, err, msg: 'Error: second' }])
  expect(calls[2]![1][0].err).toBe(err)
})

test('the context is copied on creation', () => {
  const { logger, calls } = createTestSink()
  const context: AnyObject = { a: 1 }
  const contextLogger = commonLoggerCreate(logger, context)

  context['b'] = 2
  contextLogger.log('m')

  expect(calls[0]![1]).toStrictEqual([{ a: 1, msg: 'm' }])
})

test('commonLoggerCreate with a context on console', () => {
  const logger = commonLoggerCreate(console, { a: 1 })
  logger.debug('hey')
  logger.log('hey')
  logger.error('hey')
})

test('an empty context still wraps the arguments', () => {
  const { logger, calls } = createTestSink()

  commonLoggerCreate(logger, {}).log('x')

  expect(calls[0]![1]).toStrictEqual([{ msg: 'x' }])
})

function createTestSink(): { logger: CommonLogger; calls: [CommonLogLevel, any[]][] } {
  const calls: [CommonLogLevel, any[]][] = []
  return {
    logger: commonLoggerCreate((level, args) => calls.push([level, args])),
    calls,
  }
}
