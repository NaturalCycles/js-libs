import { _pick } from '@naturalcycles/js-lib/object'
import { afterEach, expect, it, vi } from 'vitest'
import { silentConsole, testLog, testLogger } from './testing.util.js'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

it('should write each testLogger entry as a line to stdout', () => {
  vi.stubEnv('TEST_SILENT', '')
  vi.spyOn(process.stdout, 'write').mockReturnValue(true)

  testLog('hello')
  testLogger.warn({ msg: 'hej warn', a: 'a' })

  expect(vi.mocked(process.stdout.write).mock.calls).toEqual([
    ['hello\n'],
    ["hej warn { a: 'a' }\n"],
  ])
})

it('should not write testLogger entries when TEST_SILENT is set', () => {
  vi.stubEnv('TEST_SILENT', 'true')
  vi.spyOn(process.stdout, 'write').mockReturnValue(true)

  testLog('hello')
  testLogger.error('hej error')

  expect(process.stdout.write).not.toHaveBeenCalled()
})

it('should replace the console output methods with no-ops', () => {
  const methods = ['log', 'debug', 'info', 'warn', 'error', 'time', 'table'] as const
  const originalConsole = _pick(console, methods)
  const replacedMethods = methods.map(method => vi.spyOn(console, method))

  try {
    silentConsole()
    for (const method of methods) {
      console[method]('hello')
    }
  } finally {
    Object.assign(console, originalConsole)
  }

  for (const replacedMethod of replacedMethods) {
    expect(replacedMethod).not.toHaveBeenCalled()
  }
})
