/*

pn tsx packages/js-lib/scripts/deepCopyBench.script.ts

structuredClone x 14,175 ops/sec ±0.27% (99 runs sampled)
deepCopy x 23,079 ops/sec ±0.27% (98 runs sampled)

 */

import { runBenchScript } from '@naturalcycles/bench-lib'
import { _range } from '../src/array/index.js'
import { _deepCopy } from '../src/object/index.js'

const cases = _range(100).map(n => ({
  id: `id${n}`,
  odd: n % 2 === 1,
  n,
  a: 'abc',
}))

let _sink: any

runBenchScript({
  fns: {
    deepCopy: () => {
      for (const v of cases) {
        const r = _deepCopy(v)
        _sink = r
      }
    },
    structuredClone: () => {
      for (const v of cases) {
        const r = structuredClone(v)
        _sink = r
      }
    },
  },
})
