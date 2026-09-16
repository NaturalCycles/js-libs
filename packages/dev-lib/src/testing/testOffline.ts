import path from 'node:path'
import { AppError } from '@naturalcycles/js-lib/error/error.util.js'
import { red } from '@naturalcycles/nodejs-lib/colors'
import type { RunnerTask, RunnerTestCase, WorkerGlobalState } from 'vitest'
import { createMitm } from '../vendor/mitm.js'
import type { Mitm } from '../vendor/mitm.js'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

const detectLeaks = process.argv.some(a => a.includes('detectLeaks'))

let mitm: Mitm | undefined

/**
 * Forbids network requests to anything but local hosts for the rest of the test run.
 *
 * A forbidden request throws into the code under test and also fails the test that made it,
 * so the failure survives the code under test catching the error.
 *
 * Based on: https://github.com/palmerj3/jest-offline/blob/master/index.js
 */
export function testOffline(opt?: TestOfflineOptions): void {
  if (mitm) return // already applied

  if (detectLeaks) {
    console.log('NOT applying testOffline() when --detectLeaks is on')
    return
  }

  mitm = createMitm()

  mitm.on('connect', (socket, socketOptions) => {
    const { host } = socketOptions

    if (!LOCAL_HOSTS.has(host!)) {
      const testInfo = getCurrentTestInfo(host)

      process.stderr.write(red(`Network request forbidden by testOffline: ${testInfo}\n`))
      opt?.onForbiddenRequest?.(host!)
      const error = new AppError(`Network request forbidden by testOffline: ${host}`, {
        backendResponseStatusCode: 410,
      })
      failCurrentTest(error)
      throw error
    }

    socket.bypass()
  })
}

/**
 * Undo/reset the testOffline() function by allowing network calls again.
 */
export function testOnline(): void {
  mitm?.disable()
  mitm = undefined
}

/**
 * Returns the test name and test file that triggered the request (as tracked by vitest),
 * formatted as `test: <name>, file: <path>` to append to the alert, so the culprit is easy to find.
 * Returns an empty string when nothing is known (e.g. vitest is not installed or not running,
 * or the request was made outside of any test).
 *
 * Reads vitest's worker state from the global vitest stores it in (the same source that
 * `expect.getState()` uses for `testPath` and `currentTestName`), instead of importing `vitest`:
 * - it has to be synchronous (see the `connect` listener), and `vitest` can only be imported asynchronously
 * - `vitest` may not be installed in the consuming project
 */
function getCurrentTestInfo(host: string | undefined): string {
  const tokens = [host]

  const state = getWorkerState()

  if (state) {
    if (state.filepath) {
      tokens.push(`file: ${path.relative(process.cwd(), state.filepath)}`)
    }
    if (state.current?.type === 'test') {
      tokens.push(`test: ${getFullTestName(state.current)}`)
    }
  }
  return tokens.filter(Boolean).join('\n')
}

/**
 * Records the error on the running test the way `expect.soft` does: vitest only marks a test
 * passed if nothing set its state to `fail` first. This is what makes the test fail even when the
 * code under test catches the error thrown from the `connect` listener (a `pTry`, a fetcher that
 * swallows failures) — otherwise such a test passes with nothing but the alert on stderr.
 */
function failCurrentTest(error: Error): void {
  const result = getCurrentTest()?.result
  if (!result) return

  result.state = 'fail'
  result.errors ||= []
  result.errors.push({ name: error.name, message: error.message, stack: error.stack })
}

function getCurrentTest(): RunnerTestCase | undefined {
  const current = getWorkerState()?.current
  return current?.type === 'test' ? current : undefined
}

function getWorkerState(): WorkerGlobalState | undefined {
  return (globalThis as any)['__vitest_worker__'] as WorkerGlobalState | undefined
}

/**
 * Test name prefixed with the names of its parent suites (same as `expect.getState().currentTestName`),
 * e.g. `describe name > nested describe name > test name`.
 */
function getFullTestName(test: RunnerTask): string {
  const names: string[] = []
  // Walk up the chain of parent suites; it ends with `undefined` (or with the file itself, which is excluded)
  for (let task: RunnerTask | undefined = test; task && task !== test.file; task = task.suite) {
    names.push(task.name)
  }
  return names.reverse().join(' > ')
}

interface TestOfflineOptions {
  /**
   * Called when a forbidden network request is detected.
   */
  onForbiddenRequest?: (host: string) => void
}
