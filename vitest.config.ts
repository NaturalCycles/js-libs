import { SummaryReporter } from '@naturalcycles/dev-lib/cfg/vitest.config.js'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['./packages/*'],
    silent: 'passed-only',
    // fileParallelism: false, // uncomment to debug
    reporters: ['default', new SummaryReporter()],
  },
})
