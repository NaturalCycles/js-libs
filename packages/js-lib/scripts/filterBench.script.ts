/*

pn tsx scripts/filterBench

 */

import { runBenchScript } from '@naturalcycles/bench-lib'
import { _range } from '../src/index.js'
import { _filterNullishValues } from '../src/object/index.js'
import type { AnyObject } from '../src/types.js'

const objects = _range(1000).map(n => ({
  id: `id_${n}`,
  even: n % 2 === 0,
  n,
  undef: undefined,
  nullish: null,
  s: 'str',
}))

runBenchScript({
  fns: {
    candidate: () => {
      const _res = objects.map(o => filterNullishCandidate(o))
      // const res = filterNullishCandidate(objects[0]!)
    },
    // candidate2: done => {
    //   const res = objects.map(o => filterNullishCandidate2(o))
    //   // const res = filterNullishCandidate2(objects[0]!)
    //   done.resolve()
    // },
    // filterNullishAsIs: done => {
    //   // const res = objects.map(o => _filterNullishValues(o))
    //   const res = _filterNullishValues(objects[0]!)
    //   done.resolve()
    // },
    // // mutation should come later
    filterNullishMutate: () => {
      const _res = objects.map(o => _filterNullishValues(o, { mutate: true }))
      // const res = _filterNullishValues(objects[0]!, true)
    },
  },
})

function filterNullishCandidate<T extends AnyObject>(obj: T, _mutate = false): T {
  const o: any = {}

  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      o[k] = v
    }
  })

  return o
}

// biome-ignore lint: ok
function filterNullishCandidate2<T extends AnyObject>(obj: T, _mutate = false): T {
  const o: any = {}

  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined && obj[k] !== null) {
      o[k] = obj[k]
    }
  }

  return o
}
