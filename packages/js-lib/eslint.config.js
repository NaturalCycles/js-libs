import sharedConfig from '@naturalcycles/dev-lib/cfg/eslint.config.js'

export default [
  ...sharedConfig,
  {
    rules: {
      'unicorn/no-for-loop': 0, // micro-optimizations in this codebase are worth it
      '@typescript-eslint/prefer-for-of': 0, // same
    },
  },
]
