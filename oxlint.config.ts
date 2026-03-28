import { defineOxlintConfig } from '@naturalcycles/dev-lib/cfg/oxlint.config.js'

export default defineOxlintConfig({
  ignorePatterns: ['docs'],
  rules: {
    'import/no-default-export': 0,
  },
  overrides: [
    {
      files: ['packages/js-lib/**'],
      rules: {
        'typescript/prefer-for-of': 0,
      },
    },
  ],
})
