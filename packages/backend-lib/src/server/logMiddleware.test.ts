import { commonLoggerCreate } from '@naturalcycles/js-lib/log'
import type { AnyObject } from '@naturalcycles/js-lib/types'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { devLogger, gcpStructuredLogger } from './logMiddleware.js'

let calls: any[][]

beforeEach(() => {
  calls = []
  vi.spyOn(console, 'log').mockImplementation((...args: any[]) => {
    calls.push(args)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

test('gcpStructuredLogger writes the log entry as structured fields', () => {
  commonLoggerCreate(gcpStructuredLogger, { accountId: 'a1' }).warn('hello', { n: 1 })

  expect(calls).toHaveLength(1)
  expect(calls[0]).toHaveLength(1)
  expect(JSON.parse(calls[0]![0])).toStrictEqual({
    accountId: 'a1',
    n: 1,
    message: 'hello',
    severity: 'WARNING',
  })
})

test('the log entry cannot override meta', () => {
  commonLoggerCreate(gcpStructuredLogger, { severity: 'nope' }).error('x')

  expect(JSON.parse(calls[0]![0])).toStrictEqual({
    message: 'x',
    severity: 'ERROR',
  })
})

test('gcpStructuredLogger with a single string argument', () => {
  gcpStructuredLogger.log('plain')

  expect(JSON.parse(calls[0]![0])).toStrictEqual({
    message: 'plain',
  })
})

test('gcpStructuredLogger with multiple arguments', () => {
  gcpStructuredLogger.log('a', { b: 1 })

  expect(JSON.parse(calls[0]![0])).toStrictEqual({
    message: 'a { b: 1 }',
  })
})

test('gcpStructuredLogger keeps the error stack in message', () => {
  commonLoggerCreate(gcpStructuredLogger, {}).error('failed', new Error('kaboom'))

  const entry = JSON.parse(calls[0]![0])
  expect(entry.message).toMatch(/^failed\n/)
  expect(entry.message).toContain('kaboom')
  expect(entry.message).toContain('    at ')
  expect(entry.err).toEqual(
    expect.objectContaining({ name: 'Error', message: 'kaboom', stack: expect.any(String) }),
  )
})

test('gcpStructuredLogger keeps a message field, msg wins over it', () => {
  const logger = commonLoggerCreate(gcpStructuredLogger, {})

  logger.log({ message: 'x' })
  logger.log({ message: 'x' }, 'y')

  expect(JSON.parse(calls[0]![0])).toStrictEqual({ message: 'x' })
  expect(JSON.parse(calls[1]![0])).toStrictEqual({ message: 'y' })
})

test('gcpStructuredLogger survives a circular value', () => {
  const circular: AnyObject = { n: 1 }
  circular['self'] = circular

  commonLoggerCreate(gcpStructuredLogger, {}).log('hello', { circular })

  const entry = JSON.parse(calls[0]![0])
  expect(entry.message).toBe('hello')
  expect(entry.circular.n).toBe(1)
  expect(entry.circular.self).toContain('Circular')
})

test('devLogger prints the log entry', () => {
  commonLoggerCreate(devLogger, { accountId: 'a1' }).log('hello', { n: 1 })

  expect(calls).toHaveLength(1)
  const output = calls[0]![0] as string
  expect(output).toContain('hello')
  expect(output).toContain('accountId')
  expect(output).toContain('n')
})
