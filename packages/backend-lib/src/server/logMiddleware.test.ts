import { stripVTControlCharacters } from 'node:util'
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

it('should write a gcpStructuredLogger entry as structured JSON fields', () => {
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

it('should not let a context field override the severity', () => {
  gcpStructuredLogger.child({ severity: 'nope' }).error('x')

  expect(JSON.parse(calls[0]![0])).toStrictEqual({
    message: 'x',
    severity: 'ERROR',
  })
})

it('should log a single string argument as the message', () => {
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

it('should append the error stack to the message', () => {
  gcpStructuredLogger.error({ msg: 'failed', err: new Error('kaboom') })

  const entry = JSON.parse(calls[0]![0])
  expect(entry.message).toMatch(/^failed\n/)
  expect(entry.message).toContain('kaboom')
  expect(entry.message).toContain('    at ')
  expect(entry.err).toEqual(
    expect.objectContaining({ name: 'Error', message: 'kaboom', stack: expect.any(String) }),
  )
})

it('should keep a message field unless msg is set', () => {
  gcpStructuredLogger.log({ message: 'x' })
  gcpStructuredLogger.log({ message: 'x', msg: 'y' })

  expect(JSON.parse(calls[0]![0])).toStrictEqual({ message: 'x', severity: 'INFO' })
  expect(JSON.parse(calls[1]![0])).toStrictEqual({ message: 'y', severity: 'INFO' })
})

it('should serialize a circular value as a Circular marker', () => {
  const circular: AnyObject = { n: 1 }
  circular['self'] = circular

  gcpStructuredLogger.log({ msg: 'hello', circular })

  const entry = JSON.parse(calls[0]![0])
  expect(entry.message).toBe('hello')
  expect(entry.circular.n).toBe(1)
  expect(entry.circular.self).toContain('Circular')
})

it('should print the devLogger entry with its message and fields', () => {
  devLogger.child({ accountId: 'a1' }).log({ msg: 'hello', n: 1 })

  expect(calls).toHaveLength(1)
  const output = calls[0]![0] as string
  expect(stripVTControlCharacters(output)).toBe("hello { accountId: 'a1', n: 1 }")
})
