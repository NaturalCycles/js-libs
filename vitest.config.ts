import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['./packages/*'],
    silent: 'passed-only',
    // fileParallelism: false, // uncomment to debug
    deps: {
      // Disable CJS/ESM interop to match production Node.js behavior.
      // Without this, vitest auto-promotes default exports to named exports,
      // which can mask import bugs (e.g., ejs v4 renderFile issue).
      interopDefault: false,
    },
    experimental: {
      // fsModuleCache: true,
      // printImportBreakdown: true,
    },
    // detectAsyncLeaks: true, // todo: test it out!
  },
})
