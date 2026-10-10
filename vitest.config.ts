import { defineVitestMonorepoConfig } from '@naturalcycles/dev-lib/cfg/vitest.config.js'

export default defineVitestMonorepoConfig({
  test: {
    projects: ['./packages/*'],
    // This repo doesn't use coverage reports. `coverage` is a root-only option in `projects`
    // mode, so this one override disables it for the whole monorepo (dev-lib enables it in CI).
    coverage: { enabled: false },
    // fileParallelism: false, // uncomment to debug
    experimental: {
      // fsModuleCache: true,
      // printImportBreakdown: true,
    },
    // detectAsyncLeaks: true, // todo: test it out!
  },
})
