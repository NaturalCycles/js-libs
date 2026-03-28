import { defineOxlintConfig } from '@naturalcycles/dev-lib/cfg/oxlint.config.js'

export default defineOxlintConfig({
  ignorePatterns: ['docs'],
  rules: {
    'import/no-default-export': 0,
    'no-duplicate-imports': [
      2, // experimental, no auto-fix yet
      { allowSeparateTypeImports: true },
    ],
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
