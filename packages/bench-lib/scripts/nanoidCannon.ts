/*

yarn tsx scripts/nanoidCannon

 */

import { nanoid } from '@naturalcycles/nodejs-lib'
// import { nanoid as nanoidAsync } from 'nanoid/async'
import { expressSyncFunctionFactory } from '../src/cannon.profiles.js'
import { runCannonScript } from '../src/index.js'

runCannonScript(
  {
    nanoidSync: expressSyncFunctionFactory(() => nanoid()),
    // nanoidAsync: expressFunctionFactory(() => nanoidAsync()),
  },
  {
    runs: 2,
    duration: 4,
    cooldown: 1,
  },
)
