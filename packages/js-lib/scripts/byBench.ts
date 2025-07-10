/*

pn tsx scripts/byBench.ts

 */

import { runBenchScript } from '@naturalcycles/bench-lib'
import { _range } from '../src/index.js'
import type { Mapper, StringMap } from '../src/types.js'

const arr = _range(1000).map(n => ({
  id: String(n),
  odd: n % 2 === 0,
  even: n % 2 !== 0,
  by3: n % 3 === 0,
  n,
}))

runBenchScript({
  fns: {
    one: () => {
      const _a = _by1(arr, item => item.odd)
    },
    one1: () => {
      const _a = _by15(arr, item => item.odd)
    },
    two: () => {
      const _a = _by2(arr, item => item.odd)
    },
  },
})

function _by1<T>(items: readonly T[], mapper: Mapper<T, any>): StringMap<T> {
  const map: StringMap<T> = {}
  for (let i = 0; i < items.length; i++) {
    const v = items[i]!
    const k = mapper(v)
    if (k === undefined) continue
    map[k] = v
  }

  return map
}

function _by15<T>(items: readonly T[], mapper: Mapper<T, any>): StringMap<T> {
  const map: StringMap<T> = {}
  for (let i = 0; i < items.length; i++) {
    const v = items[i]!
    const k = mapper(v)
    if (k !== undefined) {
      map[k] = v
    }
  }

  return map
}

function _by2<T>(items: readonly T[], mapper: Mapper<T, any>): StringMap<T> {
  const map: StringMap<T> = {}
  for (const [_i, v] of items.entries()) {
    const k = mapper(v)
    if (k === undefined) continue
    map[k] = v
  }

  return map
}
