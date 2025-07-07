/*

pn tsx scripts/sortByBench.ts

 */

import { runBenchScript } from '@naturalcycles/bench-lib'
import { _range, type Mapper, type SortDirection } from '../src/index.js'

const arr = _range(1000).map(n => ({
  id: String(n),
  odd: n % 2 === 0,
  even: n % 2 !== 0,
  by3: n % 3 === 0,
  n: String(n * Math.random()),
}))

runBenchScript({
  fns: {
    one: () => {
      const _a = _sortBy1(arr, item => item.n)
    },
    one1: () => {
      const _a = _sortBy11(arr, item => item.n)
    },
    two: () => {
      const _a = _sortBy2(arr, item => item.n)
    },
  },
})

function _sortBy1<T>(
  items: T[],
  mapper: Mapper<T, any>,
  mutate = false,
  dir: SortDirection = 'asc',
): T[] {
  const mod = dir === 'desc' ? -1 : 1
  return (mutate ? items : [...items]).sort((_a, _b) => {
    const a = mapper(_a)
    const b = mapper(_b)
    // if (typeof a === 'number' && typeof b === 'number') return (a - b) * mod
    return String(a).localeCompare(String(b)) * mod
  })
}

function _sortBy11<T>(
  items: T[],
  mapper: Mapper<T, any>,
  mutate = false,
  dir: SortDirection = 'asc',
): T[] {
  const mod: number = dir === 'desc' ? -1 : 1
  return (mutate ? items : [...items]).sort((_a, _b) => {
    const a = mapper(_a)
    const b = mapper(_b)
    // if (typeof a === 'number' && typeof b === 'number') return (a - b) * mod
    if (a > b) return mod
    if (a < b) return -1 * mod
    return 0
  })
}

function _sortBy2<T>(
  items: T[],
  mapper: Mapper<T, any>,
  _mutate = false,
  dir: SortDirection = 'asc',
): T[] {
  const mod: number = dir === 'desc' ? -1 : 1

  const pairs: [T, any][] = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!
    const mapped = mapper(item)
    pairs.push([item, mapped] as [T, any])
  }

  const sorted = pairs.sort(([_k1, mapped1], [_k2, mapped2]) => {
    if (mapped1 > mapped2) return mod
    if (mapped1 < mapped2) return -1 * mod
    return 0
  })
  const r: T[] = []
  for (let i = 0; i < sorted.length; i++) {
    r.push(sorted[i]![0])
  }
  return r
}
