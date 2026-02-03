/*

pn tsx scripts/lazyLocalDateBench

 */

import { runBenchScript } from '@naturalcycles/bench-lib'
import { localDate } from '../src/datetime/index.js'
// import { LazyLocalDate } from '../src/__exclude/lazyLocalDate'
import type { IsoDate } from '../src/types.js'

const str = '1984-06-21' as IsoDate

runBenchScript({
  fns: {
    localDate: () => {
      const d = localDate(str)
      return d.toISODate()
    },
    // lazyLocalDate: done => {
    //   const d = new LazyLocalDate(str)
    //   const s = d.toISODate()
    //   const s2 = s
    //   done.resolve()
    // },
  },
  runs: 2,
})
