import { defineVitestConfig } from './cfg/vitest.config.js'

export default defineVitestConfig(
  {
    test: {
      // three
      // bail: 1,
    },
  },
  import.meta.dirname,
)
