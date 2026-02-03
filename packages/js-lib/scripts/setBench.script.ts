/*

pn tsx scripts/setBench

 */

import { runBenchScript } from '@naturalcycles/bench-lib'

// oxlint-disable no-unused-vars

const a1 = [1, 2, 3, 7, 9]
const a2match = [11, 12, 13, 14, 7, 4, 5]
const a2noMatch = [11, 12, 13, 14, 75, 4, 5]

runBenchScript({
  fns: {
    case1Match: () => {
      return _intersectsWith1(a1, a2match)
    },
    case2Match: () => {
      return _intersectsWith2(a1, a2match)
    },
    case1NoMatch: () => {
      return _intersectsWith1(a1, a2noMatch)
    },
    case2NoMatch: () => {
      return _intersectsWith2(a1, a2noMatch)
    },
  },
})

function _intersectsWith1<T>(a1: T[], a2: T[]): boolean {
  const a2set = new Set(a2)
  return a1.some(v => a2set.has(v))
}

function _intersectsWith2<T>(a1: T[], a2: T[]): boolean {
  return a1.some(v => a2.includes(v))
}
