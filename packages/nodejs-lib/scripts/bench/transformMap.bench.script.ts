/*

pn tsx scripts/bench/transformMap.bench

 */

import { runBench } from '@naturalcycles/bench-lib'
import { runScript } from '../../src/script/runScript.js'

// const items = _range(1000).map(id => ({
//   id,
//   even: id % 2 === 0,
// }))
//
// const mapper = (item: any): any => ({ ...item, id2: item.id })

runScript(async () => {
  await runBench({
    fns: {
      // transformNoMap: async done => {
      //   const transformed = []
      //
      //   await _pipeline([
      //     Readable.from(items),
      //     writableForEach(item => void transformed.push(item)),
      //   ])
      //
      //
      // },
      // transformMapSync: async done => {
      //   const transformed = []
      //
      //   await _pipeline([
      //     Readable.from(items),
      //     transformMapSync(mapper),
      //     writableForEach(item => void transformed.push(item)),
      //   ])
      //
      //
      // },
      // transformMapAsync: async done => {
      //   const transformed = []
      //
      //   await _pipeline([
      //     Readable.from(items),
      //     transformMap(mapper),
      //     writableForEach(item => void transformed.push(item)),
      //   ])
      //
      //
      // },
    },
    // writeSummary: true,
  })
})
