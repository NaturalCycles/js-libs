/*

pn tsx scripts/consoleVSProcessBench.ts

 */

import { runBenchScript } from '@naturalcycles/bench-lib'
import { _range } from '@naturalcycles/js-lib/array/range.js'
import { _inspect } from '@naturalcycles/nodejs-lib'

const data = _range(10).map(n => _inspect({ a: 'b', n }))

runBenchScript({
  fns: {
    consoleLog: () => {
      const _out = data.map(s => console.log(s))
    },
    processWrite: () => {
      const _out = data.map(s => process.stdout.write(s + '\n'))
    },
  },
  runs: 2,
})
