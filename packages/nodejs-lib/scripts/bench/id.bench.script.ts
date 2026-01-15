/*

pnpm --dir packages/nodejs-lib exec tsx scripts/bench/id.bench.script.ts

 */

import { runBenchScript } from '@naturalcycles/bench-lib'
import { stringId, stringIdBase62 } from '../../src/index.js'
import { nanoid } from '../../src/security/nanoid.js'

runBenchScript({
  fns: {
    nanoid: () => {
      const a = nanoid()
      return a.repeat(2)
    },
    nanoid16: () => {
      const a = nanoid(16)
      return a.repeat(2)
    },
    stringId: () => {
      const a = stringId()
      return a.repeat(2)
    },
    stringIdBase62: () => {
      const a = stringIdBase62()
      return a.repeat(2)
    },
  },
})
