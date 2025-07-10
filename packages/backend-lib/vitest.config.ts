import { defineVitestConfig, CollectReporter } from '@naturalcycles/dev-lib/cfg/vitest.config.js'

// pnpm --filter @naturalcycles/backend-lib run test collect.test.ts

export default defineVitestConfig({
  test: {
    // reporters: ['default', new CollectReporter()],
    // deps: { inline: [ /.*/ ] },
  },
})
