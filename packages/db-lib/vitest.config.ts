import { defineVitestConfig } from '@naturalcycles/dev-lib/cfg/vitest.config.js'

// pnpm --filter @naturalcycles/db-lib run test collect.test.ts

export default defineVitestConfig(
  {
    test: {
      // reporters: ['default', new CollectReporter()],
      // deps: { inline: [ /.*/ ] },
    },
  },
  import.meta.dirname,
)
