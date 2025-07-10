import { defineVitestConfig, CollectReporter } from '@naturalcycles/dev-lib/cfg/vitest.config.js'

// pnpm --filter @naturalcycles/nodejs-lib run test collect.test.ts

export default defineVitestConfig({
  test: {
    // reporters: ['default', new CollectReporter()],
    // deps: { inline: [ /.*/ ] },
  },
})
