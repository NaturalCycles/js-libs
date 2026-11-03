import { defineOxlintConfig } from '@naturalcycles/dev-lib/cfg/oxlint.config.js'

export default defineOxlintConfig({
  ignorePatterns: ['docs'],
  rules: {
    // todo: drop once dev-lib's shared config switches to `it`
    'vitest/consistent-test-it': [2, { fn: 'it', withinDescribe: 'it' }],
    'import/no-default-export': 0,
    'nc/prefer-assert': 2,
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
    {
      // `_assert` itself is implemented by throwing `AssertionError` in an if
      files: ['packages/js-lib/src/error/assert.ts'],
      rules: {
        'nc/prefer-assert': 0,
      },
    },
  ],
})
