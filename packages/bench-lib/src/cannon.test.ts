import { pDelay } from '@naturalcycles/js-lib'
import { fs2 } from '@naturalcycles/nodejs-lib/fs'
import { expect, test } from 'vitest'
import { expressFunctionFactory } from './cannon.profiles.js'
import { runCannon } from './cannon.util.js'
import { tmpDir } from './test/paths.cnst.js'

test('runCannon', async () => {
  const reportDirPath = `${tmpDir}/cannonTest`
  fs2.emptyDir(reportDirPath)

  await runCannon(
    {
      noop: expressFunctionFactory(() => 'yo'),
      async: expressFunctionFactory(async () => await pDelay(0, 'yo')),
    },
    {
      runs: 1,
      duration: 1,
      cooldown: 0,
      reportDirPath,
      silent: true,
      // writePlots: true,
      writeSummary: true,
    },
  )

  const summary = fs2.readJson<any>(`${reportDirPath}/Benchmark.summary.json`)
  expect(summary[0]).toMatchObject({
    name: 'noop',
    rpsAvg: expect.any(Number),
    // latencyAvg: expect.any(Number),
    latency50: expect.any(Number),
    // latency90: expect.any(Number),
    // latency99: expect.any(Number),
    throughputAvg: expect.any(Number),
    errors: 0,
    timeouts: 0,
  })
  expect(summary[1]).toMatchObject({
    name: 'async',
  })

  // expect(fs2.pathExists(`${reportDirPath}/Benchmark.latencyAvg.svg`)).toBe(true)
}, 240000)
