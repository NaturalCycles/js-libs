import { SummaryOnlyReporter, SummaryReporter } from '@naturalcycles/dev-lib/cfg/vitest.config.js'
import { defineConfig } from 'vitest/config'

const { VITEST_REPORTER, CLAUDE_CODE } = process.env

export default defineConfig({
  test: {
    projects: ['./packages/*'],
    silent: 'passed-only',
    // fileParallelism: false, // uncomment to debug
    reporters: getReporters(),
    experimental: {
      // fsModuleCache: true,
      // printImportBreakdown: true,
    },
  },
})

function getReporters(): (string | SummaryReporter | SummaryOnlyReporter)[] {
  if (VITEST_REPORTER === 'summary' || CLAUDE_CODE) {
    return [new SummaryOnlyReporter()]
  }
  if (VITEST_REPORTER === 'dot') {
    return ['dot']
  }
  return ['default', new SummaryReporter()]
}
