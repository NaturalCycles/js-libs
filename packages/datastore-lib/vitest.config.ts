import { defineConfig } from 'vitest/config'
import { sharedConfig } from '@naturalcycles/dev-lib/cfg/vitest.config.js'

export default defineConfig({
  test: {
    ...sharedConfig,
    // pool: 'forks',
    // silent: false,
    // poolOptions: {
    //   forks: {
    //     minForks: 1,
    //     maxForks: 1,
    //     execArgv: [
    //       '--require=./timing-hook.cjs',
    //     ],
    //   },
    // },
  },
})
