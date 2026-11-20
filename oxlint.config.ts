import { defineOxlintConfig } from '@naturalcycles/dev-lib/cfg/oxlint.config.js'

export default defineOxlintConfig({
  ignorePatterns: ['docs'],
  rules: {
    'import/no-default-export': 0,
    // Libraries introduce deprecations, so they should not use deprecated APIs themselves.
    // Not in the shared config: consumers keep using their own deprecated domain fields.
    'typescript/no-deprecated': 2,
  },
  overrides: [
    {
      files: ['packages/js-lib/**'],
      rules: {
        'typescript/prefer-for-of': 0,
      },
    },
    {
      files: ['packages/js-lib/src/**'],
      rules: {
        // js-lib implements _last and friends, and its modules avoid importing each other
        'nc/prefer-last': 0,
        'no-restricted-imports': [
          2,
          {
            patterns: [
              {
                group: ['**/index.js'],
                message:
                  'Import from the module file, not the index.js barrel: unbundled (Node, vitest, Vite dev) a barrel loads every sibling module.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['packages/js-lib/src/**/*.test.ts'],
      rules: {
        'no-restricted-imports': 0,
      },
    },
  ],
})
