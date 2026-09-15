import { defineVitestConfig } from '@naturalcycles/dev-lib/cfg/vitest.config.js'

export default defineVitestConfig(
  {
    test: {
      environment: 'happy-dom',
    },
  },
  import.meta.dirname,
)
