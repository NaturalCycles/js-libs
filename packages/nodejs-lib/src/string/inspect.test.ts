import { mockAllKindsOfThings } from '@naturalcycles/dev-lib/testing'
import { _range } from '@naturalcycles/js-lib/array/range.js'
import type { Assertion } from 'vitest'
import { expect, test } from 'vitest'
import { _inspect } from '../index.js'

test('_inspect', () => {
  expectResults(v => _inspect(v), mockAllKindsOfThings()).toMatchSnapshot()
})

test('_inspect maxLen', () => {
  const obj = _range(1, 1000).join(',')
  expect(_inspect(obj, { maxLen: 10 })).toBe(`1,2,3,4,5,... 4 KB message truncated`)
})

function expectResults(fn: (...args: any[]) => any, values: any[]): Assertion {
  // eslint-disable-next-line vitest/valid-expect
  return expect(new Map(values.map(v => [v, fn(v)])))
}
