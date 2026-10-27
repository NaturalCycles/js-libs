import { pDefer } from '@naturalcycles/js-lib/promise/pDefer.js'
import { _stringify, resetGlobalStringifyFunction } from '@naturalcycles/js-lib/string'
import { _noop } from '@naturalcycles/js-lib/types'
import { afterAll, afterEach, expect, it, vi } from 'vitest'
import { runScript } from './runScript.js'

afterEach(() => {
  process.exitCode = undefined
})

afterAll(() => {
  resetGlobalStringifyFunction()
})

it('should exit with code 0 on success and code 1 on error', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})

  expect(await runScriptAndGetExitCode(async () => {})).toBe(0)
  expect(process.exitCode).toBeUndefined()
  expect(console.error).not.toHaveBeenCalled()

  expect(
    await runScriptAndGetExitCode(async () => {
      throw new Error('bad')
    }),
  ).toBe(1)
  expect(process.exitCode).toBe(1)
  expect(console.error).toHaveBeenCalledOnce()
})

it('should set inspectStringifyFn as the global stringify function', () => {
  resetGlobalStringifyFunction()

  runScript(_noop, { noExit: true, registerUncaughtExceptionHandlers: false })

  expect(
    _stringify({
      hello: 'world',
      a: { b: 'c' },
    }),
  ).toMatchInlineSnapshot(`"{ hello: 'world', a: { b: 'c' } }"`)
})

async function runScriptAndGetExitCode(fn: () => Promise<void>): Promise<number | undefined> {
  const exited = pDefer<number | undefined>()
  vi.spyOn(process, 'exit').mockImplementation(code => exited.resolve(code as number) as never)
  runScript(fn, { registerUncaughtExceptionHandlers: false })
  return await exited
}
