/*

yarn tsx scripts/demoCannon.ts

 */

import { _randomInt } from '@naturalcycles/js-lib'
import { pDelay } from '@naturalcycles/js-lib/promise/pDelay.js'
import { expressFunctionFactory, runCannonScript } from '../src/index.js'

runCannonScript(
  {
    noop: expressFunctionFactory(() => 'yo'),
    async: expressFunctionFactory(async () => await pDelay(0, 'yo')),
    random: expressFunctionFactory(() => _randomInt(1, 10)),
  },
  {
    name: 'runCannon',
    beforeText: 'Some **text** before',
    afterText: `That's all folks`,
    // runs: 2,
    // duration: 10,
    duration: 2,
    cooldown: 1,
    reportDirPath: './demo',
  },
)
