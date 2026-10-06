import { expect, test } from 'vitest'
import { logEntryToString } from './log.util.js'

test('should render msg, err and fields separated by a space', () => {
  const line = logEntryToString({ level: 'error', msg: 'failed', err: new Error('kaboom'), n: 1 })

  expect(line).toMatch(/^failed Error: kaboom\n\s+at .*\{ n: 1 \}$/s)
})

test('should render only what the entry has', () => {
  expect(logEntryToString({ level: 'log', msg: 'hey' })).toBe('hey')
  expect(logEntryToString({ level: 'log', n: 1 })).toBe('{ n: 1 }')
  expect(logEntryToString({ level: 'log' })).toBe('')
})

test('should let the options override the error stack', () => {
  const line = logEntryToString(
    { level: 'error', err: new Error('kaboom') },
    { includeErrorStack: false },
  )

  expect(line).toBe('Error: kaboom')
})
