/**
 * `@naturalcycles/dev-lib/cfg/eslint.config.js`
 *
 * Shared eslint FLAT config.
 */

import globals from 'globals'
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintPluginUnicorn from 'eslint-plugin-unicorn'
import eslintPluginVue from 'eslint-plugin-vue'
import eslintPluginOxlint from 'eslint-plugin-oxlint'
import eslintPluginVitest from '@vitest/eslint-plugin'
import eslintPluginImportX from 'eslint-plugin-import-x'
import eslintPluginSimpleImportSort from 'eslint-plugin-simple-import-sort'
import eslintRules from './eslint-rules.js'
import eslintVueRules from './eslint-vue-rules.js'
import eslintVitestRules from './eslint-vitest-rules.js'
import eslintPrettierRules from './eslint-prettier-rules.js'
import eslintBiomeRules from './eslint-biome-rules.js'

const defaultFiles = ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts']
const srcFiles = ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.cts', 'src/**/*.mts']
const scriptsFiles = ['scripts/**/*.ts', 'scripts/**/*.tsx', 'scripts/**/*.cts', 'scripts/**/*.mts']
const e2eFiles = ['e2e/**/*.ts', 'e2e/**/*.tsx', 'e2e/**/*.cts', 'e2e/**/*.mts']
const allFiles = [...srcFiles, ...scriptsFiles, ...e2eFiles]
const testFiles = ['**/*.test.ts', '**/*.test.tsx', '**/*.test.cts', '**/*.test.mts']

// const cwd = process.cwd()
// const tsconfigSrcPath = `${cwd}/tsconfig.json`
// const tsconfigScriptsPath = `${cwd}/scripts/tsconfig.json`
// const tsconfigE2ePath = `${cwd}/e2e/tsconfig.json`

const config = getEslintConfigForDir()
export default config

/**
 * This function only exists, because typescript-eslint started to have an issue with auto-detecting tsconfigRootDir.
 * If the issue is fixed - we can remove this and come back to having just a single config.
 */
function getEslintConfigForDir() {
  return [
    {
      ...eslint.configs.recommended,
      files: defaultFiles,
    },
    // https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/src/configs/recommended-type-checked.ts
    ...tseslint.configs.recommendedTypeChecked.map(c => ({
      ...c,
      files: defaultFiles,
    })),
    // https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/src/configs/stylistic-type-checked.ts
    ...tseslint.configs.stylisticTypeChecked.map(c => ({
      ...c,
      files: defaultFiles,
    })),
    // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/configs/recommended.js
    {
      ...eslintPluginUnicorn.configs.recommended,
      files: defaultFiles,
    },
    // https://eslint.vuejs.org/user-guide/#user-guide
    ...eslintPluginVue.configs['flat/recommended'].map(c => ({
      ...c,
      files: defaultFiles,
    })),
    {
      files: testFiles,
      plugins: {
        vitest: eslintPluginVitest,
      },
      settings: {
        vitest: {
          typecheck: true,
        },
      },
      rules: {
        ...eslintPluginVitest.configs.recommended.rules,
        ...eslintVitestRules.rules,
      },
    },
    {
      files: allFiles,
      ...getConfig(),
    },
    // fs.existsSync(tsconfigSrcPath) && {
    //   files: srcFiles,
    //   ...getConfig(tsconfigSrcPath),
    // },
    // fs.existsSync(tsconfigScriptsPath) && {
    //   files: scriptsFiles,
    //   ...getConfig(tsconfigScriptsPath),
    // },
    // fs.existsSync(tsconfigE2ePath) && {
    //   files: e2eFiles,
    //   ...getConfig(tsconfigE2ePath),
    // },
    {
      ignores: ['**/node_modules/**', '**/__exclude/**', '**/*.scss', '**/*.js'],
    },
  ].filter(Boolean)
}

function getConfig(_tsconfigPath) {
  return {
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'import-x': eslintPluginImportX,
      // 'unused-imports': require('eslint-plugin-unused-imports'), // disabled in favor of biome rules
      'simple-import-sort': eslintPluginSimpleImportSort,
      // jsdoc: eslintPluginJsdoc, // oxlint
      // '@stylistic': eslintPluginStylistic, // oxlint custom plugin
    },
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.vitest,
        NodeJS: 'readonly',
      },
      parserOptions: {
        // project: tsconfigPath,
        projectService: true,
        // tsconfigRootDir: cwd,
        parser: tseslint.parser,
        extraFileExtensions: ['.vue', '.html'],
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      ...eslintRules.rules,
      ...eslintVueRules.rules,
      ...eslintPrettierRules.rules, // disable eslint rules already covered by prettier
      ...eslintBiomeRules.rules, // disable eslint rules already covered by biome
      ...eslintPluginOxlint.configs['flat/all'][0].rules, // disable eslint rules already covered by oxlint
    },
  }
}
