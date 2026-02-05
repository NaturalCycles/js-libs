/*
  Default config for `lint-staged`.
  Extendable.
*/

const {
  platform,
  arch,
  versions: { node },
} = process

console.log(`lint-staged.config.js runs on node ${node} ${platform} ${arch}`)

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import { _assert } from '@naturalcycles/js-lib/error/assert.js'
import { semver2 } from '@naturalcycles/js-lib/semver'
import { exec2 } from '@naturalcycles/nodejs-lib/exec2'
import micromatch from 'micromatch'
import { prettierExtensionsAll, lintExclude, minActionlintVersion } from './_cnst.js'

const oxfmtConfigPath = ['.oxfmtrc.jsonc', '.oxfmtrc.json'].find(fs.existsSync)

const stylelintConfigPath = [`stylelint.config.js`].find(fs.existsSync)

const eslintConfigPath = ['eslint.config.js'].find(fs.existsSync)

const oxlintConfigPath = ['.oxlintrc.json'].find(fs.existsSync)

let oxfmtCmd = undefined

if (oxfmtConfigPath) {
  oxfmtCmd = 'oxfmt --no-error-on-unmatched-pattern'
}

let eslintCmd = undefined

if (eslintConfigPath) {
  eslintCmd = [
    'eslint',
    '--fix',
    `--config ${eslintConfigPath}`,
    '--cache',
    '--cache-location node_modules/.cache/eslint',
  ]
    .filter(Boolean)
    .join(' ')
}

let oxlintCmd = undefined

if (oxlintConfigPath) {
  oxlintCmd = [
    'oxlint',
    // '--report-unused-disable-directives', // wrongly reports disabled eslint (not oxlint) rules
    '--type-aware',
    '--type-check',
    '--fix',
    '--fix-suggestions',
    // '--fix-dangerously', // disabled, too unsafe
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

const linters = {
  // oxlint, eslint, stylelint, oxfmt
  [`./{src,scripts,e2e}/**/*.{${prettierExtensionsAll}}`]: match =>
    runOxlintEslintStylelintOxfmt(match),

  // Files in root dir: oxfmt
  [`./*.{${prettierExtensionsAll}}`]: runOxfmt,

  // ktlint
  '**/*.{kt,kts}': runKtlint,

  './.github/**/*.{yml,yaml}': runActionlintOxfmt,
}

export function runOxlintEslintStylelintOxfmt(match) {
  const filesList = getFilesList(match)
  if (!filesList) return []

  return [oxlintCmd, eslintCmd, stylelintCmd, oxfmtCmd]
    .filter(Boolean)
    .map(s => `${s} ${filesList}`)
}

export function runOxlintOxfmt(match) {
  const filesList = getFilesList(match)
  if (!filesList) return []
  return [oxlintCmd, oxfmtCmd].filter(Boolean).map(s => `${s} ${filesList}`)
}

export function runOxfmt(match) {
  const filesList = getFilesList(match)
  if (!filesList || !oxfmtCmd) return []
  return [oxfmtCmd].map(s => `${s} ${filesList}`)
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

export function runActionlintOxfmt(match) {
  if (!match.length) return []

  const tools = []

  if (canRunBinary('actionlint')) {
    requireActionlintVersion()
    // run actionlint on all files at once, as it's fast anyway
    tools.push('actionlint')
  } else {
    console.log(
      `actionlint is not installed and won't be run.\nThis is how to install it: https://github.com/rhysd/actionlint/blob/main/docs/install.md`,
    )
  }

  if (oxfmtCmd) {
    tools.push(oxfmtCmd)
  }

  return tools
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
