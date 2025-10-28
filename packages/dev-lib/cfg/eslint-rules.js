export default {
  rules: {
    '@typescript-eslint/adjacent-overload-signatures': 2,
    '@typescript-eslint/ban-ts-comment': 0,
    'no-restricted-globals': 0, // oxlint
    '@typescript-eslint/no-restricted-types': [
      2,
      {
        types: {
          Object: {
            message:
              'Avoid using the `Object` type. Did you mean `object`? Consider using Record<string, any> instead',
          },
          object: {
            message: [
              'The `object` type is currently hard to use ([see this issue](https://github.com/microsoft/TypeScript/issues/21732)).',
              'Consider using `Record<string, any>` instead, as it allows you to more easily inspect and use the keys.',
            ].join('\n'),
          },
          Boolean: {
            message: 'Avoid using the `Boolean` type. Did you mean `boolean`?',
          },
          Number: {
            message: 'Avoid using the `Number` type. Did you mean `number`?',
          },
          String: {
            message: 'Avoid using the `String` type. Did you mean `string`?',
          },
          Symbol: {
            message: 'Avoid using the `Symbol` type. Did you mean `symbol`?',
          },
        },
      },
    ],
    '@typescript-eslint/consistent-type-imports': 2,
    '@typescript-eslint/consistent-type-exports': 2,
    '@typescript-eslint/consistent-type-assertions': 2,
    '@typescript-eslint/consistent-type-definitions': [2, 'interface'],
    '@typescript-eslint/consistent-generic-constructors': [2, 'constructor'],
    // Doc: https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/naming-convention.md
    // Loosely based on this: https://github.com/xojs/eslint-config-xo-typescript/blob/main/index.js
    '@typescript-eslint/naming-convention': [
      2,
      {
        selector: 'default',
        format: ['camelCase'],
      },
      {
        selector: 'import',
        format: ['camelCase', 'PascalCase'],
      },
      {
        selector: ['function', 'parameter', 'property', 'method', 'memberLike'],
        format: ['camelCase'],
        leadingUnderscore: 'allowSingleOrDouble',
        trailingUnderscore: 'allowSingleOrDouble',
        // Ignore `{'Retry-After': retryAfter}` type properties.
        filter: {
          regex: '[- ]',
          match: false,
        },
      },
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE'],
        leadingUnderscore: 'allowSingleOrDouble',
        trailingUnderscore: 'allowSingleOrDouble',
      },
      {
        selector: 'classProperty',
        format: [
          'camelCase',
          'UPPER_CASE',
          'PascalCase', // Frontend sometimes re-exports enums as class properties
        ],
        leadingUnderscore: 'allowSingleOrDouble',
        trailingUnderscore: 'allowSingleOrDouble',
      },
      {
        selector: ['objectLiteralProperty', 'objectLiteralMethod', 'typeProperty', 'enumMember'],
        format: [
          'camelCase',
          'UPPER_CASE',
          // only for 3rd-party code/api compatibility! Try to avoid in our code
          'PascalCase',
          'snake_case',
        ],
        leadingUnderscore: 'allowSingleOrDouble',
        trailingUnderscore: 'allowSingleOrDouble',
      },
      // Allow destructured variables to not follow the rules
      {
        selector: ['variable', 'parameter'],
        modifiers: ['destructured'],
        format: null,
      },
      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
      {
        selector: 'typeParameter',
        format: ['PascalCase', 'UPPER_CASE'],
      },
      // Allow these in non-camel-case when quoted.
      {
        selector: [
          'classProperty',
          'objectLiteralProperty',
          'typeProperty',
          'classMethod',
          'objectLiteralMethod',
          'typeMethod',
          'accessor',
          'enumMember',
        ],
        format: null,
        modifiers: ['requiresQuotes'],
      },
    ],
    '@typescript-eslint/no-array-constructor': 2,
    '@typescript-eslint/no-extra-non-null-assertion': 2,
    '@typescript-eslint/no-floating-promises': 2,
    '@typescript-eslint/no-inferrable-types': [
      2,
      {
        ignoreParameters: true,
      },
    ],
    '@typescript-eslint/no-misused-new': 2,
    '@typescript-eslint/no-misused-spread': 0, // ox
    '@typescript-eslint/no-non-null-asserted-optional-chain': 2,
    '@typescript-eslint/no-unused-expressions': 0, // oxlint
    '@typescript-eslint/prefer-as-const': 2,
    '@typescript-eslint/prefer-for-of': 0, // oxlint
    '@typescript-eslint/prefer-function-type': 2,
    '@typescript-eslint/prefer-namespace-keyword': 2,
    '@typescript-eslint/promise-function-async': [
      2,
      {
        checkArrowFunctions: false,
        checkFunctionDeclarations: true,
        checkFunctionExpressions: true,
        checkMethodDeclarations: true,
      },
    ],
    '@typescript-eslint/triple-slash-reference': 2,
    complexity: [
      2,
      {
        max: 40,
      },
    ],
    'constructor-super': 2,
    // eqeqeq: [2, 'smart'], // oxlint
    'for-direction': 2,
    'getter-return': 2,
    'id-denylist': [
      2,
      'any',
      'Number',
      'number',
      'String',
      'string',
      'Boolean',
      'boolean',
      'Undefined',
      'undefined',
    ],
    'id-match': 2,
    'simple-import-sort/imports': [
      2,
      {
        // This is what "removes any newlines between imports":
        groups: [['^\\u0000', '^node:', '^@?\\w', '^', '^\\.']],
      },
    ],
    'simple-import-sort/exports': 2,
    // 'import-x/order': 0, // disabled in favor of `simple-import-sort`
    // 'import-x/namespace': 0, // issues with e.g globby
    // 'import-x/no-unresolved': 0, // breaks for type-aliases, e.g '@/store'
    'import-x/no-anonymous-default-export': 0, // oxlint
    'import-x/no-duplicates': [0, { 'prefer-inline': false }], // oxlint
    'import-x/export': 2, // todo: oxlint when it matures
    'import-x/no-empty-named-blocks': 0, // oxlint
    // Disabling no-cycle as the slowest rule. Oxlint is to be adopted instead
    // 'import-x/no-cycle': [
    //   2,
    //   {
    //     ignoreExternal: true,
    //     allowUnsafeDynamicCyclicDependency: true,
    //     maxDepth: 10,
    //   },
    // ],
    'import-x/no-useless-path-segments': 2,
    'import-x/no-default-export': 0, // biome, oxlint
    // 'import-x/no-commonjs': 2, // biome `noCommonJs`
    // 'import-x/extensions': [2, 'always'], // biome useImportExtensions
    'no-array-constructor': 0,
    'no-async-promise-executor': 2,
    'no-bitwise': 0, // oxlint
    'no-caller': 0, // oxlint
    'no-case-declarations': 2,
    'no-class-assign': 2,
    'no-compare-neg-zero': 2,
    'no-cond-assign': 2,
    'no-const-assign': 2,
    'no-constant-condition': 2,
    'no-constant-binary-expression': 0, // oxlint
    'no-control-regex': 2,
    'no-debugger': 2,
    'no-delete-var': 2,
    'no-dupe-args': 2,
    'no-dupe-else-if': 0, // oxlint
    'no-dupe-keys': 2,
    'no-duplicate-case': 2,
    'no-empty-static-block': 0, // oxlint
    'no-empty': [2, { allowEmptyCatch: true }],
    'no-empty-character-class': 2,
    'no-empty-function': 0,
    'no-empty-pattern': 2,
    'no-eval': 2,
    'no-ex-assign': 2,
    'no-extra-boolean-cast': 2,
    'no-implicit-coercion': [
      2,
      {
        allow: ['!!'],
      },
    ],
    'no-fallthrough': 2,
    'no-func-assign': 2,
    'no-global-assign': 2,
    'no-import-assign': 0, // used in some unit tests
    'no-inner-declarations': 2,
    'no-invalid-regexp': 0, // oxlint
    'no-invalid-this': 0, // too many false positives in valid classes
    'no-irregular-whitespace': 0, // oxlint
    'no-misleading-character-class': 2,
    'no-new-symbol': 2,
    'no-obj-calls': 2,
    'no-octal': 2,
    'no-prototype-builtins': 2,
    'no-redeclare': 2,
    'no-regex-spaces': 2,
    curly: [0, 'multi-line'], // this one is an exception that can conflict with prettier, oxlint
    'no-self-assign': 2,
    'no-setter-return': 2,
    'no-shadow': 0, // it is buggy with TypeScript enums
    'no-shadow-restricted-names': 2,
    'no-sparse-arrays': 0, // oxlint
    'no-this-before-super': 2,
    '@typescript-eslint/only-throw-error': 0, // biome
    'no-undef': 0, // covered by TS, conflicts with typescript-eslint
    'no-underscore-dangle': 0,
    'no-unreachable': 2,
    'no-unsafe-finally': 2,
    'no-unsafe-negation': 2,
    'no-unused-labels': 2,
    'no-unused-private-class-members': 0, // oxlint
    'no-useless-backreference': 0, // oxlint
    'no-useless-catch': 2,
    'no-useless-escape': 0, // oxlint
    'no-useless-assignment': 2,
    'no-unneeded-ternary': 0, // oxlint
    'no-duplicate-imports': 0, // too many false-positives (with e.g import type + import on next line)
    'no-var': 2,
    'no-with': 2,
    'object-shorthand': 2,
    'one-var': [2, 'never'],
    'prefer-const': [
      2,
      {
        destructuring: 'all',
      },
    ],
    'require-yield': 2,
    'spaced-comment': [
      2,
      'always',
      {
        markers: ['/'],
      },
    ],
    'use-isnan': 2,
    'valid-typeof': 2,
    'no-await-in-loop': 0, // it's actually often ok
    'no-extend-native': 0, // oxlint
    'guard-for-in': 0, // oxlint
    'prefer-spread': 0, // oxlint
    '@typescript-eslint/no-namespace': [
      2,
      {
        allowDeclarations: true, // allows `namespace NodeJS {}` augmentations
      },
    ],
    'no-unused-vars': 0, // replaced by `unused-imports/no-unused-vars`
    '@typescript-eslint/no-unused-vars': [
      0, // replaced by `unused-imports/no-unused-vars`
      {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
      },
    ],
    // unused-imports/* rules are replaced by biome
    // 'unused-imports/no-unused-imports': 2,
    // 'unused-imports/no-unused-vars': [
    //   2,
    //   { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
    // ],
    '@typescript-eslint/no-duplicate-enum-values': 0, // oxlint
    '@typescript-eslint/no-redundant-type-constituents': 0, // `'a' | string` is still useful for DX
    '@typescript-eslint/no-empty-function': 0,
    '@typescript-eslint/no-var-requires': 0,
    '@typescript-eslint/no-require-imports': 0,
    '@typescript-eslint/no-explicit-any': 0, // oxlint
    '@typescript-eslint/no-non-null-assertion': 0,
    '@typescript-eslint/explicit-module-boundary-types': [
      2,
      {
        allowArgumentsExplicitlyTypedAsAny: true,
      },
    ],
    '@typescript-eslint/array-type': 2,
    '@typescript-eslint/prefer-regexp-exec': 0, // auto-fixer breaks code sometimes!
    '@typescript-eslint/prefer-find': 2,
    'prefer-promise-reject-errors': 0,
    '@typescript-eslint/prefer-promise-reject-errors': 2,
    'unicorn/prefer-import-meta-properties': 2,
    'unicorn/no-array-callback-reference': 0, // false positives
    'unicorn/no-process-exit': 0,
    'unicorn/prefer-single-call': 0,
    'unicorn/no-abusive-eslint-disable': 0,
    'unicorn/no-negated-condition': 0,
    'unicorn/no-unnecessary-polyfills': 0, // little value, bottleneck performance
    'unicorn/no-array-method-this-argument': 0, // bug: wrongly removes`readable.flatMap` concurrency option
    'unicorn/prefer-array-flat': 0, // bug: messes up with `readable.flatMap`
    'unicorn/number-literal-case': 0, // conflicts with prettier
    'unicorn/prevent-abbreviations': 0,
    'unicorn/prefer-module': 0,
    'unicorn/no-null': 0,
    'unicorn/filename-case': 0,
    'unicorn/prefer-node-protocol': 0, // oxlint
    'unicorn/prefer-set-has': 0,
    'unicorn/explicit-length-check': 0,
    'unicorn/no-array-for-each': 0,
    'unicorn/prefer-at': 0, // iOS 15.4+, oxlint
    'unicorn/import-style': 0, // todo: fix
    'unicorn/prefer-spread': 0, // fails on joiSchema.concat() which is not an array!
    'unicorn/prefer-structured-clone': 0, // no real advantage, plus in most of the cases we want JSON to remove undefined, etc.
    'unicorn/better-regex': 0, // we still believe that [0-9] is clearer than [\d]
    'unicorn/no-for-loop': 0, // oxlint has similar
    'unicorn/no-array-reduce': 0, // oxlint
    'unicorn/consistent-assert': 0, // oxlint
    'unicorn/consistent-date-clone': 0, // oxlint
    'unicorn/consistent-empty-array-spread': 0, // oxlint
    'unicorn/consistent-existence-index-check': 0, // oxlint
    'unicorn/escape-case': 0, // oxlint
    'unicorn/no-console-spaces': 0, // oxlint
    'unicorn/no-hex-escape': 0, // oxlint
    'unicorn/no-instanceof-builtins': 0, // oxlint
    'unicorn/no-lonely-if': 0, // oxlint
    'unicorn/no-named-default': 0, // oxlint
    'unicorn/no-negation-in-equality-check': 0, // oxlint
    'unicorn/no-new-buffer': 0, // oxlint
    'unicorn/no-accessor-recursion': 0, // oxlint
    'unicorn/no-anonymous-default-export': 0, // oxlint
    'unicorn/prefer-string-replace-all': 0, // oxlint
    'unicorn/prefer-math-min-max': 0, // oxlint
    'unicorn/prefer-code-point': 0, // oxlint
    'unicorn/prefer-global-this': 0, // oxlint
    'unicorn/error-message': 0, // oxlint
    'unicorn/no-zero-fractions': 0, // oxlint
    'unicorn/prefer-array-some': 0, // oxlint
    'unicorn/prefer-math-trunc': 0, // oxlint
    'unicorn/no-object-as-default-parameter': 0, // doesn't allow e.g method (opt = { skipValidation: true })
    'unicorn/catch-error-name': [
      0, // oxlint
      {
        name: 'err',
        ignore: [/^err\d*$/, /^_/],
      },
    ],
    'unicorn/prefer-switch': 0,
    'unicorn/no-useless-undefined': 0,
    'unicorn/prefer-ternary': [0, 'only-single-line'], // single-line doesn't really work, hence disabled
    'unicorn/numeric-separators-style': [2, { onlyIfContainsSeparator: true }],
    'unicorn/consistent-destructuring': 0, // todo: enable later
    'unicorn/no-nested-ternary': 0,
    'unicorn/consistent-function-scoping': 0, // todo: consider enabling later
    'unicorn/no-this-assignment': 0,
    'unicorn/prefer-string-slice': 0, // todo: consider?
    'unicorn/prefer-number-properties': 0,
    'unicorn/prefer-negative-index': 0,
    'unicorn/prefer-regexp-test': 0,
    'unicorn/prefer-query-selector': 0,
    'unicorn/prefer-prototype-methods': 0, // false-positive on node promisify() of callback functions
    'unicorn/expiring-todo-comments': 1, // warning, instead of error
    'unicorn/no-await-in-promise-methods': 0, // oxlint
    'unicorn/no-document-cookie': 0, // oxlint
    'unicorn/no-empty-file': 0, // oxlint
    'unicorn/no-invalid-fetch-options': 0, // oxlint
    'unicorn/no-invalid-remove-event-listener': 0, // oxlint
    'unicorn/no-magic-array-flat-depth': 0, // oxlint
    'unicorn/no-new-array': 0, // oxlint
    'unicorn/no-single-promise-in-promise-methods': 0, // oxlint
    'unicorn/no-unnecessary-await': 0, // oxlint
    'unicorn/no-useless-fallback-in-spread': 0, // oxlint
    'unicorn/no-useless-length-check': 0, // oxlint
    'unicorn/no-useless-spread': 0, // oxlint
    'unicorn/prefer-array-find': 0, // oxlint
    'unicorn/prefer-modern-math-apis': 0, // oxlint
    'unicorn/prefer-set-size': 0, // oxlint
    'unicorn/prefer-string-starts-ends-with': 0, // oxlint
    '@typescript-eslint/return-await': [2, 'always'],
    '@typescript-eslint/require-await': 0,
    'unicorn/no-array-reverse': 0, // too early
    '@typescript-eslint/no-misused-promises': 0,
    '@typescript-eslint/no-unsafe-assignment': 0,
    '@typescript-eslint/no-unsafe-member-access': 0,
    '@typescript-eslint/no-unsafe-call': 0,
    '@typescript-eslint/no-unsafe-function-type': 2,
    '@typescript-eslint/no-wrapper-object-types': 2,
    '@typescript-eslint/no-empty-object-type': [
      2,
      {
        allowInterfaces: 'always',
      },
    ],
    '@typescript-eslint/no-unnecessary-template-expression': 2,
    '@typescript-eslint/no-unnecessary-parameter-property-assignment': 2,
    '@typescript-eslint/restrict-template-expressions': 0,
    '@typescript-eslint/no-unsafe-return': 0,
    '@typescript-eslint/restrict-plus-operands': 0,
    '@typescript-eslint/unbound-method': 0,
    '@typescript-eslint/no-unsafe-argument': 0, // prevents "legit" use of `any`
    'unicorn/prefer-export-from': 0, // breaks auto-imports in IntelliJ Idea
    'unicorn/require-module-specifiers': 0, // oxlint
    'unicorn/prefer-classlist-toggle': 0, // oxlint
    'unicorn/no-unnecessary-array-splice-count': 0, // oxlint
    'unicorn/no-useless-error-capture-stack-trace': 0, // oxlint
    'unicorn/prefer-top-level-await': 0, // oxlint
    'unicorn/prefer-class-fields': 0, // oxlint
    'unicorn/no-await-expression-member': 0, // some cases are better as-is
    'unicorn/no-array-sort': 0,
    'unicorn/prefer-json-parse-buffer': 0, // typescript doesn't allow it
    'no-constructor-return': 2,
    // 'no-promise-executor-return': 2,
    'no-self-compare': 2,
    'no-unreachable-loop': 2,
    // 'func-style': [2, 'declaration'],
    'logical-assignment-operators': [
      2,
      'always',
      {
        enforceForIfStatements: true,
      },
    ],
    'max-params': [0, { max: 5 }], // oxlint
    'no-else-return': 2,
    'no-sequences': 2,
    'no-useless-concat': 0, // oxlint
    '@typescript-eslint/ban-tslint-comment': 2,
    '@typescript-eslint/explicit-function-return-type': [
      2,
      {
        // defaults
        // allowExpressions: false,
        // allowTypedFunctionExpressions: true,
        // allowHigherOrderFunctions: true,
        // allowDirectConstAssertionInArrowFunctions: true,
        // allowConciseArrowFunctionExpressionsStartingWithVoid: false,
        // allowFunctionsWithoutTypeParameters: false,
        // allowedNames: [],
        // allowIIFEs: false,
        // overrides:
        allowExpressions: true,
      },
    ],
    '@typescript-eslint/method-signature-style': 2,
    '@typescript-eslint/no-unnecessary-boolean-literal-compare': 2,
    // '@typescript-eslint/no-unnecessary-condition': [2, {
    //   allowConstantLoopConditions: true,
    // }],
    '@typescript-eslint/prefer-includes': 2,
    '@typescript-eslint/prefer-optional-chain': 2,
    '@typescript-eslint/prefer-string-starts-ends-with': 2,
    '@typescript-eslint/prefer-ts-expect-error': 2,
    '@typescript-eslint/explicit-member-accessibility': [
      2,
      {
        accessibility: 'no-public',
        overrides: { parameterProperties: 'off' },
      },
    ],
    '@typescript-eslint/no-mixed-enums': 2,
    '@typescript-eslint/no-non-null-asserted-nullish-coalescing': 2,
    '@typescript-eslint/no-unnecessary-qualifier': 2,
    '@typescript-eslint/prefer-enum-initializers': 2,
    '@typescript-eslint/prefer-literal-enum-member': 2,
    '@typescript-eslint/prefer-reduce-type-parameter': 0, // gives ts compilation error
    '@typescript-eslint/prefer-nullish-coalescing': 0, // we prefer `||` actually
    '@typescript-eslint/dot-notation': 0, // not always desireable
    '@typescript-eslint/consistent-indexed-object-style': 0, // Record looses the name of the key
    '@typescript-eslint/no-unsafe-enum-comparison': 0, // not practically helpful
    // stylistic
    '@stylistic/padding-line-between-statements': [
      2,
      { blankLine: 'always', prev: 'function', next: '*' },
      { blankLine: 'always', prev: '*', next: 'function' },
      { blankLine: 'always', prev: 'class', next: '*' },
      { blankLine: 'always', prev: '*', next: 'class' },
    ],
    '@stylistic/lines-between-class-members': [2, 'always', { exceptAfterSingleLine: true }],
  },
}
