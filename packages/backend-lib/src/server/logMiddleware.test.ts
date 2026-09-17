import { commonLoggerContext } from '@naturalcycles/js-lib/log'
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

test('gcpStructuredLogger lifts the log context into the structured entry', () => {
  commonLoggerContext(gcpStructuredLogger, { accountId: 'a1' }).warn('hello', { n: 1 })

  expect(calls).toHaveLength(1)
  expect(calls[0]).toHaveLength(1)
  expect(JSON.parse(calls[0]![0])).toEqual({
    accountId: 'a1',
    message: 'hello { n: 1 }',
    severity: 'WARNING',
  })
})

test('log context cannot override meta', () => {
  commonLoggerContext(gcpStructuredLogger, { severity: 'nope' }).error('hello')

  expect(JSON.parse(calls[0]![0])).toEqual({
    message: 'hello',
    severity: 'ERROR',
  })
})

test('gcpStructuredLogger without a log context', () => {
  gcpStructuredLogger.log('plain')

  expect(JSON.parse(calls[0]![0])).toEqual({
    message: 'plain',
  })
})

test('devLogger prints the log context', () => {
  commonLoggerContext(devLogger, { accountId: 'a1' }).log('hello')

  expect(calls).toHaveLength(1)
  const output = calls[0]![0] as string
  expect(output).toContain('hello')
  expect(output).toContain('accountId')
})
