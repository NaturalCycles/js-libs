import { defineVitestConfig } from '@naturalcycles/dev-lib/cfg/vitest.config.js'

export default defineVitestConfig(
  {
    test: {
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
  },
  import.meta.dirname,
)
