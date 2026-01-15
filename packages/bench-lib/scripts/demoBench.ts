/*

pnpm --dir packages/bench-lib exec tsx scripts/demoBench.ts

 */

import { runBenchScript } from '../src/index.js'

runBenchScript({
  fns: {
    noop: () => {},
    random: () => {
      return Math.random()
    },
    // timeout: done => {
    //   setTimeout(() => done.resolve(), 0)
    // },
    // asyncAwait: async done => {
    //   await new Promise<void>(resolve => resolve())
    //   done.resolve()
    // },
    // immediate: done => {
    //   setImmediate(() => done.resolve())
    // },
  },
  runs: 1,
  reportDirPath: './demo',
  // writePlot: true,
  writeSummary: true,
})
