import { _expectedErrorString, pExpectedError } from '@naturalcycles/js-lib/error'
import { _stringify } from '@naturalcycles/js-lib/string/stringify.js'
import { expect, it } from 'vitest'
import { exec2, SpawnError } from './exec2.js'

const silent = !!process.env['TEST_SILENT']

/**
 * Platform-agnostic check for signal termination.
 * - macOS: reports signal directly (e.g., 'killed by signal SIGTERM'), exitCode=-1
 * - Linux: reports exit code 128+signal (e.g., 143 for SIGTERM), exitCode=143
 * - Other platforms: may vary, so we check for either pattern
 */
function isSignalTermination(errString: string, exitCode?: number): boolean {
  // Direct signal reporting (macOS style)
  if (errString.includes('signal')) return true
  // Exit code 128+ indicates signal termination (Linux style: 128 + signal number)
  if (exitCode !== undefined && exitCode >= 128) return true
  // Also check for exit code in error message (e.g., "exited with code 143")
  const codeMatch = errString.match(/code (\d+)/)
  if (codeMatch && Number(codeMatch[1]) >= 128) return true
  return false
}

// Test commands using node for predictability
const cmdOk = `node -e "console.log('hello')"`
const cmdError = `node -e "console.error('err'); process.exit(1)"`
const cmdSignal = `node -e "process.kill(process.pid, 'SIGTERM')"`

it('should not throw when spawn exits with code 0', () => {
  exec2.spawn(cmdOk, { stdio: silent ? 'pipe' : 'inherit' })
  // no error
})

it('should throw with the exit code and command when spawn exits non-zero', () => {
  const err = _expectedErrorString(() =>
    exec2.spawn(cmdError, { stdio: silent ? 'pipe' : 'inherit' }),
  )
  expect(err).toMatchInlineSnapshot(
    `"Error: spawn exited with code 1: node -e "console.error('err'); process.exit(1)""`,
  )
})

it('should return stdout from exec', () => {
  const s = exec2.exec(cmdOk)
  expect(s).toBe('hello')
})

it('should throw with the exit code and command when exec exits non-zero', () => {
  const err = _expectedErrorString(() =>
    exec2.exec(cmdError, { stdio: silent ? 'pipe' : undefined }),
  )
  expect(err).toMatchInlineSnapshot(
    `"Error: exec exited with code 1: node -e "console.error('err'); process.exit(1)""`,
  )
})

it('should resolve when spawnAsync exits with code 0', async () => {
  await exec2.spawnAsync(cmdOk, { stdio: silent ? 'pipe' : 'inherit' })
  // no error
})

it('should reject with the exit code and command when spawnAsync exits non-zero', async () => {
  const err = await pExpectedError(
    exec2.spawnAsync(cmdError, { stdio: silent ? 'pipe' : 'inherit' }),
    Error,
  )
  expect(_stringify(err)).toMatchInlineSnapshot(
    `"Error: spawnAsync exited with code 1: node -e "console.error('err'); process.exit(1)""`,
  )
})

it('should reject when the spawnAsync process is killed by a signal', async () => {
  const err = await pExpectedError(
    exec2.spawnAsync(cmdSignal, { stdio: silent ? 'pipe' : 'inherit' }),
    Error,
  )
  expect(isSignalTermination(_stringify(err))).toBe(true)
})

it('should return the exit code, stdout and stderr from spawnAsyncAndReturn', async () => {
  const s = await exec2.spawnAsyncAndReturn(cmdOk, { printWhileRunning: !silent })
  expect(s.exitCode).toBe(0)
  expect(s.stderr).toBe('')
  expect(s.stdout).toBe('hello')
})

it('should throw a SpawnError with exit code and output from spawnAsyncAndReturn on a non-zero exit', async () => {
  const err = await pExpectedError(
    exec2.spawnAsyncAndReturn(cmdError, { printWhileRunning: !silent }),
    SpawnError,
  )
  expect(_stringify(err)).toMatchInlineSnapshot(
    `"SpawnError: spawnAsyncAndReturn exited with code 1: node -e "console.error('err'); process.exit(1)""`,
  )
  expect(err.data.exitCode).toBe(1)
  expect(err.data.stdout).toBe('')
  expect(err.data.stderr).toBe('err')
})

it('should return a non-zero exit code from spawnAsyncAndReturn when throwOnNonZeroCode is false', async () => {
  const { exitCode, stdout, stderr } = await exec2.spawnAsyncAndReturn(cmdError, {
    throwOnNonZeroCode: false,
    printWhileRunning: !silent,
  })
  expect(exitCode).toBe(1)
  expect(stdout).toBe('')
  expect(stderr).toBe('err')
})

it('should throw a SpawnError from spawnAsyncAndReturn when the process is killed by a signal', async () => {
  const err = await pExpectedError(
    exec2.spawnAsyncAndReturn(cmdSignal, { printWhileRunning: !silent }),
    SpawnError,
  )
  expect(isSignalTermination(_stringify(err), err.data.exitCode)).toBe(true)
})
