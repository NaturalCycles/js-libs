/*

pn tsx scripts/jsonParseBench

 */

import { runBenchScript } from '@naturalcycles/bench-lib'
import { mockAllKindsOfThings } from '@naturalcycles/dev-lib/testing'
import { _jsonParseIfPossible } from '../src/index.js'

// mostly not-json
const data = mockAllKindsOfThings()
// mostly (only) json
// const data = _range(10).map(n => `{ "a": "b", "n": ${n}}`)

runBenchScript({
  fns: {
    before: () => {
      const _out = data.map(t => before(t))
    },
    after: () => {
      const _out = data.map(t => _jsonParseIfPossible(t))
    },
  },
  runs: 2,
})

export function before(obj: any, reviver?: (this: any, key: string, value: any) => any): any {
  // Optimization: only try to parse if it looks like JSON: starts with a json possible character
  if (typeof obj === 'string' && obj) {
    try {
      return JSON.parse(obj, reviver)
    } catch {}
  }

  return obj
}
