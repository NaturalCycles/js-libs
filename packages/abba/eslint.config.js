import sharedConfig from '@naturalcycles/dev-lib/cfg/eslint.config.js'

export default [
  ...sharedConfig,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 2,
    },
  },
]
