/*
  Default config for `lint-staged`.
  Extendable.
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
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'
import { prettierExtensionsAll, lintExclude, minActionlintVersion } from './_cnst.js'

const prettierConfigPath = [`prettier.config.js`].find(fs.existsSync)

const stylelintConfigPath = [`stylelint.config.js`].find(fs.existsSync)

const eslintConfigPath = ['eslint.config.js'].find(fs.existsSync)

const oxlintConfigPath = ['.oxlintrc.json'].find(fs.existsSync)

let prettierCmd = undefined

if (prettierConfigPath) {
  const experimental = !hasPrettierOverrides()
  prettierCmd = [
    'prettier --write --log-level=warn',
    experimental && '--cache-location',
    experimental && 'node_modules/.cache/prettier',
    experimental && `--experimental-cli`,
    experimental ? '--config-path' : `--config`,
    prettierConfigPath,
  ]
    .filter(Boolean)
    .join(' ')
}

let eslintCmd = undefined

if (eslintConfigPath) {
  eslintCmd = [
    'eslint',
    '--fix',
    `--config ${eslintConfigPath}`,
    '--cache',
    '--cache-location node_modules/.cache/eslint',
    // concurrency is disabled here, as it's not expected to help,
    // since we're running on a limited set of files already
    // ESLINT_CONCURRENCY && `--concurrency=${ESLINT_CONCURRENCY}`,
  ]
    .filter(Boolean)
    .join(' ')
}

let oxlintCmd = undefined

if (oxlintConfigPath) {
  oxlintCmd = [
    'oxlint',
    '--type-aware',
    '--fix',
    '--fix-suggestions',
    '--fix-dangerously',
    '--max-warnings=0',
  ]
    .filter(Boolean)
    .join(' ')
}

const stylelintExists =
  !!stylelintConfigPath &&
  fs.existsSync('node_modules/stylelint') &&
  fs.existsSync('node_modules/stylelint-config-standard-scss')
const stylelintCmd = stylelintExists ? `stylelint --fix --config ${stylelintConfigPath}` : undefined

const biomeConfigPath = ['biome.jsonc'].find(p => fs.existsSync(p))
const biomeCmd = biomeConfigPath && `biome lint --write --unsafe --no-errors-on-unmatched`

const linters = {
  // biome, oxlint, eslint, stylelint, prettier
  [`./{src,scripts,e2e}/**/*.{${prettierExtensionsAll}}`]: match =>
    runBiomeEslintStylelintPrettier(match),

  // Files in root dir: prettier
  [`./*.{${prettierExtensionsAll}}`]: runPrettier,

  // ktlint
  '**/*.{kt,kts}': runKtlint,

  './.github/**/*.{yml,yaml}': runActionlint,
}

export function runBiomeEslintStylelintPrettier(match) {
  const filesList = getFilesList(match)
  if (!filesList) return []

  return [biomeCmd, oxlintCmd, eslintCmd, stylelintCmd, prettierCmd]
    .filter(Boolean)
    .map(s => `${s} ${filesList}`)
}

export function runBiomeOxlintPrettier(match) {
  const filesList = getFilesList(match)
  if (!filesList) return []
  return [biomeCmd, oxlintCmd, prettierCmd].filter(Boolean).map(s => `${s} ${filesList}`)
}

export function runOxlintPrettier(match) {
  const filesList = getFilesList(match)
  if (!filesList) return []
  return [oxlintCmd, prettierCmd].filter(Boolean).map(s => `${s} ${filesList}`)
}

export function runPrettier(match) {
  const filesList = getFilesList(match)
  if (!filesList || !prettierCmd) return []
  return [prettierCmd].map(s => `${s} ${filesList}`)
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

function hasPrettierOverrides() {
  try {
    return fs2.readText('prettier.config.js').includes('overrides')
  } catch {
    return false
  }
}

export default linters
