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
  expect(_inspect(obj, { maxLen: 100 })).toMatchInlineSnapshot(`
    "1,2,3,4,5,6,7,8,9,10,11,12,13,14,1
    ... 4 Kb message truncated ...
    91,992,993,994,995,996,997,998,999"
  `)
})

function expectResults(fn: (...args: any[]) => any, values: any[]): Assertion {
  return expect(new Map(values.map(v => [v, fn(v)])))
}
