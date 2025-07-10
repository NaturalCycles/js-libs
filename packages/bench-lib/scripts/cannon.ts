/*

yarn tsx scripts/cannon.ts

 */

import { _randomInt } from '@naturalcycles/js-lib'
import { pDelay } from '@naturalcycles/js-lib/promise'
import { expressFunctionFactory, runCannonScript } from '../src/index.js'

runCannonScript(
  {
    // bareNode: bareNodeServerFactory,
    // bareExpress: bareExpressServerFactory,
    custom: expressFunctionFactory(() => 'yo'),
    customAsync: expressFunctionFactory(async () => await pDelay(0, 'yo')),
    rnd: expressFunctionFactory(() => _randomInt(1, 10)),
    // customAsync2: expressAsyncFunctionFactory(async () => 'yo'),
  },
  {
    // runs: 2,
    duration: 10,
    cooldown: 1,
    silent: true,
    // renderResultsTable: false,
    // renderLatencyTable: false,
  },
)
