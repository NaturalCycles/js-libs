/*

pn tsx scripts/todayIsoDateBench

 */

import { runBenchScript } from '@naturalcycles/bench-lib'
import type { IsoDate } from '../src/types.js'

runBenchScript({
  fns: {
    v1: () => {
      const s = fn1()
      const _r = s
    },
    v2: () => {
      const s = fn2()
      const _r = s
    },
  },
})

function fn1(): IsoDate {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-') as IsoDate
}

function fn2(): IsoDate {
  return new Date().toISOString().slice(0, 10) as IsoDate
}

// function fn1(): IsoDateString {
//   return localTimeNow().toPretty()
// }
//
// function fn2(): IsoDateString {
//   return localTimeNow().toPretty2()
// }
