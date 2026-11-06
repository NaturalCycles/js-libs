import { defineVitestMonorepoConfig } from '@naturalcycles/dev-lib/cfg/vitest.config.js'

export default defineVitestMonorepoConfig({
  test: {
    // pnpm-config has no tests (and no vitest.config.ts), so it would get Vitest defaults (isolate: true)
    projects: ['./packages/*', '!./packages/pnpm-config'],
    // fileParallelism: false, // uncomment to debug
    // detectAsyncLeaks: true, // uncomment to debug
    experimental: {
      // uncomment to debug import times:
      // importDurations: { print: true, limit: 100 },
    },
  },
})
