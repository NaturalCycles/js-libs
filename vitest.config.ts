import { getRootReporters } from '@naturalcycles/dev-lib/cfg/vitest.config.js'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['./packages/*'],
    // Root-only reporters: agents get the compact 'agent' reporter,
    // everyone else gets the default reporters + a monorepo-wide SummaryReporter
    // (slowest tests across ALL projects).
    reporters: getRootReporters(),
    silent: 'passed-only',
    // fileParallelism: false, // uncomment to debug
    deps: {
      // Disable CJS/ESM interop to match production Node.js behavior.
      // Without this, vitest auto-promotes default exports to named exports,
      // which can mask import bugs (e.g., ejs v4 renderFile issue).
      interopDefault: false,
    },
    experimental: {
      // fsModuleCache: true,
      // printImportBreakdown: true,
    },
    // detectAsyncLeaks: true, // todo: test it out!
  },
})
