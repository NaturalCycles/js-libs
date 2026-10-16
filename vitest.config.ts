import { defineVitestMonorepoConfig } from '@naturalcycles/dev-lib/cfg/vitest.config.js'

export default defineVitestMonorepoConfig({
  test: {
    projects: ['./packages/*'],
    // fileParallelism: false, // uncomment to debug
    // detectAsyncLeaks: true, // uncomment to debug
    experimental: {
      // uncomment to debug import times:
      // importDurations: { print: true, limit: 100 },
    },
  },
})
