/*
  Default config for `lint-staged`.
  Extendable.
  Supports default configs for `prettier`, `stylelint`, `eslint`, if they are not found in target project.
*/

const {
  platform,
  arch,
  versions: { node },
  // env: { ESLINT_CONCURRENCY },
} = process

console.log(`lint-staged.config.js runs on node ${node} ${platform} ${arch}`)

import fs from 'node:fs'
import micromatch from 'micromatch'
import { execSync } from 'node:child_process'
import { _assert } from '@naturalcycles/js-lib/error/assert.js'
import { semver2 } from '@naturalcycles/js-lib/semver'
import { exec2 } from '@naturalcycles/nodejs-lib/exec2'

import {
  prettierDirs,
  prettierExtensionsExclusive,
  prettierExtensionsAll,
  stylelintExtensions,
  lintExclude,
  minActionlintVersion,
} from './_cnst.js'

const prettierConfigPath = [`prettier.config.js`].find(fs.existsSync)

const stylelintConfigPath = [`stylelint.config.js`].find(fs.existsSync)

// this is to support "Solution style tsconfig.json" (as used in Angular10, for example)
// const tsconfigPathRoot = ['tsconfig.base.json'].find(p => fs.existsSync(p)) || 'tsconfig.json'
// const tsconfigPathRoot = 'tsconfig.json'

// const eslintConfigPathRoot = ['eslint.config.js'].find(p => fs.existsSync(p))

const prettierCmd =
  !!prettierConfigPath &&
  `prettier --write --experimental-cli --config-path ${prettierConfigPath} --cache-location node_modules/.cache/prettier`
const eslintCmd = [
  'eslint',
  '--fix',
  '--cache',
  // concurrency is disabled here, as it's not expected to help,
  // since we're running on a limited set of files already
  // ESLINT_CONCURRENCY && `--concurrency=${ESLINT_CONCURRENCY}`,
]
  .filter(Boolean)
  .join(' ')

const stylelintExists =
  !!stylelintConfigPath &&
  fs.existsSync('node_modules/stylelint') &&
  fs.existsSync('node_modules/stylelint-config-standard-scss')
const stylelintCmd = stylelintExists ? `stylelint --fix --config ${stylelintConfigPath}` : undefined

// const biomeInstalled = fs.existsSync('node_modules/@biomejs/biome')
const biomeConfigPath = ['biome.jsonc'].find(p => fs.existsSync(p))
const biomeCmd = biomeConfigPath && `biome lint --write --unsafe --no-errors-on-unmatched`

// if (!eslintConfigPathRoot) {
//   console.log('eslint is skipped, because ./eslint.config.js is not present')
// }
// if (!prettierCmd) {
//   console.log('prettier is skipped, because ./prettier.config.js is not present')
// }
// if (!stylelintCmd) {
//   console.log(
//     'stylelint is skipped, because ./stylelint.config.js is not present, or stylelint and/or stylelint-config-standard-scss are not installed',
//   )
// }

const linters = {
  // biome, eslint, prettier
  './src/**/*.{ts,tsx,cts,mts,vue,html}': match => runBiomeEslintPrettier(match, 'src'),

  // For all other files we run only Prettier (because e.g eslint screws *.scss files)
  // todo: this should be no longer needed when flat eslint config is default and it has global ignore of scss files
  [`./{${prettierDirs}}/**/*.{${prettierExtensionsExclusive}}`]: runPrettier,

  // Files for ESLint + Prettier
  // doesn't work, cause typescript parser+rules are conflicting
  // [`./{${prettierDirs}}/**/*.{js,jsx}`]: match => {
  //   const filesList = micromatch.not(match, lintExclude).join(' ')
  //   if (!filesList) return []
  //   return [
  //     `${eslintCmd} --config ${eslintConfigPathRoot} --parser=espree`,
  //     prettierCmd].map(s => `${s} ${filesList}`)
  // },

  // Files for Biome + Stylelint + Prettier
  [`./{${prettierDirs}}/**/*.{${stylelintExtensions}}`]: runBiomeStylelintPrettier,

  // Files in root dir: prettier
  [`./*.{${prettierExtensionsAll}}`]: runPrettier,

  // ktlint
  '**/*.{kt,kts}': runKtlint,

  './.github/**/*.{yml,yaml}': runActionlint,
}

// /scripts are separate, cause they require separate tsconfig.json
if (fs.existsSync(`./scripts`)) {
  Object.assign(linters, {
    './scripts/**/*.{ts,tsx,cts,mts,vue,html}': match => runBiomeEslintPrettier(match, 'scripts'),
  })
}

// /e2e
if (fs.existsSync(`./e2e`)) {
  Object.assign(linters, {
    './e2e/**/*.{ts,tsx,cts,mts}': match => runBiomeEslintPrettier(match, 'e2e'),
  })
}

export function runBiomeEslintPrettier(match, dir) {
  const filesList = getFilesList(match)
  if (!filesList) return []

  let configDir = dir
  if (dir === 'src') {
    configDir = '.'
  }

  const cwd = process.cwd()
  const eslintConfigPath = `${configDir}/eslint.config.js`
  const tsconfigPath = [cwd, configDir !== '.' && configDir, 'tsconfig.json']
    .filter(Boolean)
    .join('/')

  return [
    biomeCmd,
    eslintConfigPath &&
      `${eslintCmd} --config ${eslintConfigPath} --parser-options=project:${tsconfigPath} --cache-location node_modules/.cache/eslint_${dir}`,
    prettierCmd,
  ]
    .filter(Boolean)
    .map(s => `${s} ${filesList}`)
}

export function runPrettier(match) {
  const filesList = getFilesList(match)
  if (!filesList || !prettierCmd) return []
  return [prettierCmd].map(s => `${s} ${filesList}`)
}

export function runBiomeStylelintPrettier(match) {
  const filesList = getFilesList(match)
  if (!filesList) return []
  // Biome's css/scss support is still in nursery, so Biome is disabled for now
  return [stylelintCmd, prettierCmd].filter(Boolean).map(s => `${s} ${filesList}`)
}

export function runKtlint(match) {
  const filesList = getFilesList(match)
  if (!filesList) return []
  const dir = './node_modules/@naturalcycles/ktlint'

  if (!fs.existsSync(dir)) {
    console.log(`!!\n!! Please install @naturalcycles/ktlint to lint *.kt files\n!!\n`, filesList)
    return []
  }

  return [`${dir}/resources/ktlint -F ${filesList}`]
}

export function runActionlint(match) {
  if (!match.length) return []

  if (!canRunBinary('actionlint')) {
    console.log(
      `actionlint is not installed and won't be run.\nThis is how to install it: https://github.com/rhysd/actionlint/blob/main/docs/install.md`,
    )
    return []
  }

  requireActionlintVersion()

  // run actionlint on all files at once, as it's fast anyway
  return [`actionlint`]
}

function getFilesList(match) {
  return micromatch.not(match, lintExclude).join(' ')
}

function canRunBinary(name) {
  try {
    execSync(`which ${name}`)
    return true
  } catch {
    return false
  }
}

function requireActionlintVersion() {
  const version = getActionLintVersion()
  if (!version) {
    return
  }

  console.log(`actionlint version: ${version}`)

  _assert(
    semver2(version).isSameOrAfter(minActionlintVersion),
    `actionlint needs to be updated. Min accepted version: ${minActionlintVersion}, local version: ${version}\nThis is how to install/update it: https://github.com/rhysd/actionlint/blob/main/docs/install.md`,
  )
}

function getActionLintVersion() {
  try {
    return exec2.exec('actionlint --version').split('\n')[0]
  } catch (err) {
    console.log(err)
    return undefined
  }
}

export default linters
