import { fs2 } from '@naturalcycles/nodejs-lib'
import { expect, test } from 'vitest'
import { runBench } from './bench.util.js'
import { tmpDir } from './test/paths.cnst.js'

test('runBench', async () => {
  const reportDirPath = `${tmpDir}/benchTest`
  fs2.emptyDir(reportDirPath)

  const r = await runBench({
    fns: {
      noop: () => {},
      // immediate: done => {
      //   setImmediate(() => done.resolve())
      // },
    },
    runs: 1,
    reportDirPath,
    // writePlot: true,
    writeSummary: true,
  })

  expect(r).toMatchObject({
    noop: expect.any(Number),
    // immediate: expect.any(Number),
  })

  const summary = fs2.readJson(`${reportDirPath}/runBench.json`)
  expect(summary).toMatchObject({
    noop: expect.any(Number),
    // immediate: expect.any(Number),
  })

  // expect(fs2.pathExists(`${reportDirPath}/runBench.svg`)).toBe(true)
}, 240000)
