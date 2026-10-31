import type { Assertion } from 'vitest'
import { expect } from 'vitest'

export function convertHrtime(hrtime: [number, number]): Record<string, number> {
  const nanoseconds = hrtime[0] * 1e9 + hrtime[1]
  const milliseconds = nanoseconds / 1e6
  const seconds = nanoseconds / 1e9

  return {
    seconds,
    milliseconds,
    nanoseconds,
  }
}

export function timeSpan(): () => number {
  const start: [number, number] = process.hrtime()
  const end = (type: string): number => convertHrtime(process.hrtime(start))[type]!

  const ret: any = () => end('milliseconds')
  ret.rounded = () => Math.round(end('milliseconds'))
  ret.seconds = () => end('seconds')
  ret.nanoseconds = () => end('nanoseconds')

  return ret
}

/**
 * Strips away the Path from all files, keeping the filename.
 * Strips away line/column too, as it changes often.
 * To support deterministic tests.
 */
export function normalizeStack(s: string): string {
  // at /Users/kirill/Idea/js-lib/src/promise/pRetry.test.ts:118:36
  // at file:///Users/kirill/Idea/js-lib/node_modules/@vitest/runner/dist/index.js:174:14

  return (
    s
      .replaceAll(/\(\/.*\/(.*):.*:.*\)/gm, '$1')
      // .replaceAll(/file:\/\/(.*)\/node_modules\/(.*):.*:.*$/gm, '$2')
      .replaceAll(/.*at \/.*/gm, '')
      .replaceAll(/.*\/node_modules\/.*/gm, '')
      .split('\n')
      .filter(Boolean)
      .join('\n')
  )
}

export function expectWithMessage(
  msg: string,
  expected: any,
  actual: any,
  expectedStr?: any,
  actualStr?: any,
): void {
  if (expected !== actual) {
    throw new Error(
      [
        msg,
        `Expected   : ${expected}`,
        `Actual     : ${actual}`,
        expectedStr && `ExpectedStr: ${expectedStr}`,
        actualStr && `ActualStr  : ${actualStr}`,
      ]
        .filter(Boolean)
        .join('\n'),
    )
  }
}

export function isUTC(): boolean {
  return process.env['TZ'] === 'UTC'
}

export function expectResults(fn: (...args: any[]) => any, values: readonly any[]): Assertion {
  return expect(new Map(values.map(v => [v, fn(v)])))
}
