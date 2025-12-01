import { pDelay } from '@naturalcycles/js-lib/promise/pDelay.js'
import {
  _stringify,
  resetGlobalStringifyFunction,
  setGlobalStringifyFunction,
} from '@naturalcycles/js-lib/string'
import { _noop } from '@naturalcycles/js-lib/types'
import { afterAll, expect, test, vi } from 'vitest'
import { inspectStringifyFn } from '../string/inspect.js'
import { runScript } from './runScript.js'

const detectLeaks = process.argv.some(a => a.includes('detectLeaks'))

afterAll(() => {
  resetGlobalStringifyFunction()
})

// skipped, because mocking process.exit no longer works
test.skip('runScript', async () => {
  if (detectLeaks) return // Somehow it fails with detect-leaks SOMETIMES
  const processExit = vi.spyOn(process, 'exit').mockImplementation(_noop as any)
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  runScript(async () => {})
  await pDelay() // because runScript is not actually async
  expect(processExit).toHaveBeenCalledTimes(1)
  expect(processExit).toHaveBeenCalledWith(0)
  expect(process.exitCode).toBeUndefined()
  expect(consoleError).toHaveBeenCalledTimes(0)

  vi.resetAllMocks() // resets counters

  runScript(async () => {
    throw new Error('bad')
  })
  await pDelay() // because runScript is not actually async
  expect(process.exitCode).toBe(1)
  expect(processExit).toHaveBeenCalledTimes(1)
  expect(processExit).toHaveBeenCalledWith(1)
  expect(consoleError).toHaveBeenCalledTimes(1)
})

test('setGlobalStringifyFunction', () => {
  vi.spyOn(process, 'exit').mockImplementation(_noop as any)

  setGlobalStringifyFunction(inspectStringifyFn)

  expect(
    _stringify({
      hello: 'world',
      a: { b: 'c' },
    }),
  ).toMatchInlineSnapshot(`"{ hello: 'world', a: { b: 'c' } }"`)
})
