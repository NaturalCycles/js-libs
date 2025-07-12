/*

pn tsx scripts/startsWithBench

 */

/* eslint-disable */

import { runBenchScript } from '@naturalcycles/bench-lib'
import { _range } from '../src/array/index.js'

const regex = /^{/

// mostly not-json
// const data = mockAllKindsOfThings()
// mostly (only) json
const data = _range(10).map(n => `{ "a": "b", "n": ${n}}`)

runBenchScript({
  fns: {
    startsWith: () => {
      const _out = data.map(t => t.startsWith('{'))
    },
    regex: () => {
      const _out = data.map(t => regex.test(t))
    },
  },
})
