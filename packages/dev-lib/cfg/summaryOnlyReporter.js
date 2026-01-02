import { _ms } from '@naturalcycles/js-lib/datetime'

/**
 * A minimal reporter that only shows failures and the final summary.
 * No per-test, no per-file output - just failures and final summary.
 *
 * Use via: VITEST_REPORTER=summary vitest run
 */
export class SummaryOnlyReporter {
  onTestRunEnd(testModules) {
    let files = 0
    let duration = 0

    for (const mod of testModules) {
      files++
      duration += mod.diagnostic().duration
    }

    console.log()
    console.log(`  Files: ${files}`)
    console.log(`  Duration: ${_ms(duration)}`)
    console.log()
  }
}

export default SummaryOnlyReporter
