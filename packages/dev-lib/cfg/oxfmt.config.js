import { defineConfig } from 'oxfmt'

export function defineOxfmtConfig(config) {
  return defineConfig({
    ...sharedConfig,
    ...config,
    ignorePatterns: [...sharedConfig.ignorePatterns, ...(config.ignorePatterns || [])],
  })
}

export const sharedConfig = {
  ignorePatterns: ['__exclude', '*.compact.json', '*.mock.json'],
  arrowParens: 'avoid',
  proseWrap: 'always',
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  sortPackageJson: false,
  sortImports: {
    newlinesBetween: false,
    groups: [
      'side_effect',
      'side_effect-style',
      'builtin',
      'external',
      ['internal', 'parent', 'sibling', 'index'],
      'unknown',
    ],
  },
}
