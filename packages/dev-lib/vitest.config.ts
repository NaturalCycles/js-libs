import { defineVitestConfig } from './cfg/vitest.config.js'

export default defineVitestConfig(
  {
    test: {},
  },
  import.meta.dirname,
)
