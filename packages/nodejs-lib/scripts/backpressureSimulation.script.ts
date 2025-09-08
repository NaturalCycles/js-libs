/*

pn tsx scripts/backpressureSimulation.script.ts

 */

import { _range } from '@naturalcycles/js-lib/array/range.js'
import { pDelay } from '@naturalcycles/js-lib/promise/pDelay.js'
import { runScript } from '../src/script/runScript.js'
import { Pipeline, readableFromArray } from '../src/stream/index.js'

interface Item {
  id: string
}

// Backpressure is used when processDelay / concurrency > sourceDelay, so it'll cause source read throttling
const sourceCount = 500
const sourceDelay = 100
const processDelay = 300
const concurrency = 2

runScript(async () => {
  // emits: 0, 1, 2, 3 after 100ms each
  const readable = readableFromArray(_range(0, sourceCount), i =>
    pDelay(sourceDelay, {
      id: String(i),
    } as Item),
  )

  await Pipeline.from(readable)
    .logProgress({ logEvery: 30 })
    .forEach(async _item => await pDelay(processDelay), { concurrency })
})
