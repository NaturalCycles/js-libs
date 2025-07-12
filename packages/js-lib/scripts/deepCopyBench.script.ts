/*

pn tsx scripts/deepCopyBench

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

runBenchScript({
  fns: {
    deepCopy: () => {
      for (const v of cases) {
        const r = _deepCopy(v)
        const _r2 = r
      }
    },
    structuredClone: () => {
      for (const v of cases) {
        try {
          const r = structuredClone(v)
          const _r2 = r
        } catch {}
      }
    },
  },
})
