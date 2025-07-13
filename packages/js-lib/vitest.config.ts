import { defineVitestConfig, CollectReporter } from '@naturalcycles/dev-lib/cfg/vitest.config.js'

// pnpm --filter @naturalcycles/js-lib run test collect.test.ts

export default defineVitestConfig({
  test: {
    isolate: false, // experimenting
    bail: 1,
    // fileParallelism: false,
    // silent: false,
    // reporters: ['default', new CollectReporter()],
    // deps: { inline: [ /.*/ ] },
  },
})
