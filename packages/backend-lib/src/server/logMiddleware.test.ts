import type { AnyObject } from '@naturalcycles/js-lib/types'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
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

it('gcpStructuredLogger writes the log entry as structured fields', () => {
  gcpStructuredLogger.child({ accountId: 'a1' }).warn({ msg: 'hello', n: 1 })

  expect(calls).toHaveLength(1)
  expect(calls[0]).toHaveLength(1)
  expect(JSON.parse(calls[0]![0])).toStrictEqual({
    accountId: 'a1',
    n: 1,
    message: 'hello',
    severity: 'WARNING',
  })
})

it('the log entry cannot override meta', () => {
  gcpStructuredLogger.child({ severity: 'nope' }).error('x')

  expect(JSON.parse(calls[0]![0])).toStrictEqual({
    message: 'x',
    severity: 'ERROR',
  })
})

it('gcpStructuredLogger with a single string argument', () => {
  gcpStructuredLogger.log('plain')

  expect(JSON.parse(calls[0]![0])).toStrictEqual({ message: 'plain', severity: 'INFO' })
})

it('should log an Error input as err, with the inspected error as message', () => {
  gcpStructuredLogger.error(new Error('kaboom'))

  const entry = JSON.parse(calls[0]![0])
  expect(entry.message).toMatch(/^Error: kaboom\n/)
  expect(entry.err).toEqual(expect.objectContaining({ name: 'Error', message: 'kaboom' }))
  expect(entry.severity).toBe('ERROR')
})

it('gcpStructuredLogger keeps the error stack in message', () => {
  gcpStructuredLogger.error({ msg: 'failed', err: new Error('kaboom') })

  const entry = JSON.parse(calls[0]![0])
  expect(entry.message).toMatch(/^failed\n/)
  expect(entry.message).toContain('kaboom')
  expect(entry.message).toContain('    at ')
  expect(entry.err).toEqual(
    expect.objectContaining({ name: 'Error', message: 'kaboom', stack: expect.any(String) }),
  )
})

it('gcpStructuredLogger keeps a message field, msg wins over it', () => {
  gcpStructuredLogger.log({ message: 'x' })
  gcpStructuredLogger.log({ message: 'x', msg: 'y' })

  expect(JSON.parse(calls[0]![0])).toStrictEqual({ message: 'x', severity: 'INFO' })
  expect(JSON.parse(calls[1]![0])).toStrictEqual({ message: 'y', severity: 'INFO' })
})

it('gcpStructuredLogger survives a circular value', () => {
  const circular: AnyObject = { n: 1 }
  circular['self'] = circular

  gcpStructuredLogger.log({ msg: 'hello', circular })

  const entry = JSON.parse(calls[0]![0])
  expect(entry.message).toBe('hello')
  expect(entry.circular.n).toBe(1)
  expect(entry.circular.self).toContain('Circular')
})

it('devLogger prints the log entry', () => {
  devLogger.child({ accountId: 'a1' }).log({ msg: 'hello', n: 1 })

  expect(calls).toHaveLength(1)
  const output = calls[0]![0] as string
  expect(output).toContain('hello')
  expect(output).toContain('accountId')
  expect(output).toContain('n')
})
