import sharedConfig from './cfg/eslint.config.js'

// This file is left purely for the purpose of testing dev-lib's shared eslint config
export default [
  ...sharedConfig,
  {
    rules: {},
  },
]
