/*

pn tsx scripts/jsonBench

 */

import { runBenchScript } from '@naturalcycles/bench-lib'
import { mockAllKindsOfThings } from '@naturalcycles/dev-lib/testing'
import { _range } from '../src/array/index.js'
import { _safeJsonStringify } from '../src/string/index.js'

const data = _range(10).map(() => mockAllKindsOfThings())

runBenchScript({
  fns: {
    native: () => {
      const _s = JSON.stringify(data)
    },
    safeJsonStringify: () => {
      const _s = _safeJsonStringify(data)
    },
  },
})
