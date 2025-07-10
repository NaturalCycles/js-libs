/*

pn tsx scripts/mergeObjectsBench.ts

spread x 507 ops/sec ±0.42% (94 runs sampled)
_mergeObjects x 983 ops/sec ±0.41% (96 runs sampled)

 */

import { runBenchScript } from '@naturalcycles/bench-lib'
import type { StringMap } from '@naturalcycles/js-lib/types'

let _sink: any

const times = 10_000
const [obj1, obj2] = generateObjects(times)

runBenchScript({
  fns: {
    spread: () => {
      _sink = { ...obj1, ...obj2 }
      // assert.ok(Object.keys(sink).length === times)
    },

    // ObjectAssign: () => {
    //   sink = Object.assign({}, obj1, obj2)
    //   // assert.ok(Object.keys(sink).length === times)
    // },

    // ObjectExtend: () => {
    //   const obj3 = _deepCopy(obj1)
    //   sink = Object.assign(obj3, obj2)
    //   // assert.ok(Object.keys(sink).length === times)
    // },

    // preferLists: () => {
    //   const arr1 = Object.keys(obj1).map(k => ({ key: k, value: obj1[k] }))
    //   const arr2 = Object.keys(obj2).map(k => ({ key: k, value: obj2[k] }))
    //   sink = _by([...arr1, ...arr2], o => o.key)
    //   // assert.ok(Object.keys(sink).length === times)
    // },

    _mergeObjects: () => {
      _sink = _mergeObjects(obj1, obj2)
    },

    // preferKirill2: () => {
    //   const map: StringMap<string> = {}
    //   for (const k of [...Object.keys(obj1), ...Object.keys(obj2)]) {
    //     map[k] = obj1[k] || obj2[k]
    //   }
    //   sink = map
    // },
  },
})

function generateObjects(count: number): [StringMap<string>, StringMap<string>] {
  const obj1: StringMap<string> = {}
  const obj2: StringMap<string> = {}
  for (let i = 0; i < Math.floor(count / 2); i++) {
    obj1[`key1_${i}`] = `value${i}`
  }
  for (let i = Math.floor(count / 2); i < count; i++) {
    obj2[`key2_${i}`] = `value${i}`
  }
  return [obj1, obj2]
}

function _mergeObjects<T>(obj1: StringMap<T>, obj2: StringMap<T>): StringMap<T> {
  const map: StringMap<T> = {}
  for (const k of Object.keys(obj1)) map[k] = obj1[k]
  for (const k of Object.keys(obj2)) map[k] = obj2[k]
  return map
}
