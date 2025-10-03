export default {
  rules: {
    'vitest/consistent-test-filename': 2,
    'vitest/consistent-test-it': [
      2,
      {
        fn: 'test',
        withinDescribe: 'test',
      },
    ],
    'vitest/expect-expect': 0,
    'vitest/max-nested-describe': [2, { max: 3 }],
    'vitest/no-alias-methods': 2,
    'vitest/no-commented-out-tests': 0,
    'vitest/no-duplicate-hooks': 2,
    'vitest/no-test-return-statement': 2,
    'vitest/no-import-node-test': 0, // oxlint
    'vitest/padding-around-before-all-blocks': 2,
    'vitest/padding-around-after-all-blocks': 2,
    'vitest/padding-around-before-each-blocks': 2,
    'vitest/padding-around-after-each-blocks': 2,
    'vitest/padding-around-describe-blocks': 2,
    'vitest/prefer-hooks-in-order': 2,
    'vitest/prefer-hooks-on-top': 2,
    'vitest/prefer-mock-promise-shorthand': 2,
    'vitest/prefer-spy-on': 2,
    'vitest/prefer-strict-boolean-matchers': 2,
    'vitest/prefer-to-be': 2,
    'vitest/prefer-called-exactly-once-with': 0, // todo: enable
    'vitest/prefer-to-contain': 2,
    'vitest/prefer-to-have-length': 2,
    'vitest/prefer-vi-mocked': 2,
    'vitest/require-to-throw-message': 2,
    'vitest/valid-title': 0, // noisy
    'vitest/valid-expect-in-promise': 2,
  },
}
