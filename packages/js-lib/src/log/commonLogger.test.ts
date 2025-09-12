import { test } from 'vitest'
import type { CommonLogger, CommonLogWithLevelFunction } from './commonLogger.js'
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
