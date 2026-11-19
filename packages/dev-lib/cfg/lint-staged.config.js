/*
  Default config for `lint-staged`.
  Extendable.
*/

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { _assert } from '@naturalcycles/js-lib/error/assert.js'
import { semver2 } from '@naturalcycles/js-lib/semver'
import { exec2 } from '@naturalcycles/nodejs-lib/exec2'
import picomatch from 'picomatch'
import {
  eslintDirs,
  lintExclude,
  minActionlintVersion,
  stylelintDirs,
  stylelintExtensions,
} from './_cnst.js'

const {
  platform,
  arch,
  versions: { node },
} = process

console.log(`lint-staged.config.js runs on node ${node} ${platform} ${arch}`)

const cwd = process.cwd()

const oxfmtConfigPath = ['oxfmt.config.ts'].find(fs.existsSync)

const stylelintConfigPath = [`stylelint.config.js`].find(fs.existsSync)

const eslintConfigPath = ['eslint.config.js'].find(fs.existsSync)

const oxlintConfigPath = ['oxlint.config.ts'].find(fs.existsSync)

let oxfmtCmd = undefined

if (oxfmtConfigPath) {
  oxfmtCmd = 'oxfmt --no-error-on-unmatched-pattern --disable-nested-config'
}

let eslintCmd = undefined

if (eslintConfigPath) {
  eslintCmd = [
    'eslint',
    '--fix',
    `--config ${eslintConfigPath}`,
    '--cache',
    '--cache-location node_modules/.cache/eslint',
    '--no-warn-ignored',
  ]
    .filter(Boolean)
    .join(' ')
}

let oxlintCmd = undefined

if (oxlintConfigPath) {
  oxlintCmd = [
    'oxlint',
    '--fix',
    '--fix-suggestions',
    '--fix-dangerously',
    '--no-error-on-unmatched-pattern',
    '--disable-nested-config',
  ]
    .filter(Boolean)
    .join(' ')
}

const stylelintExists =
  !!stylelintConfigPath &&
  fs.existsSync('node_modules/stylelint') &&
  fs.existsSync('node_modules/stylelint-config-standard-scss')
const stylelintCmd = stylelintExists ? `stylelint --fix --config ${stylelintConfigPath}` : undefined

// Same dirs as `dev-lib check` passes to eslint. ESLint config decides the file types.
const isEslintFile = picomatch(eslintDirs.map(dir => `${dir}/**`))
// Same files as `dev-lib check` passes to stylelint
const isStylelintFile = picomatch(`{${stylelintDirs.join(',')}}/**/*.{${stylelintExtensions}}`, {
  dot: true,
  ignore: lintExclude,
})
const isActionlintFile = picomatch('.github/**/*.{yml,yaml}')

// actionlint, oxlint, eslint, stylelint, oxfmt
// Run sequentially, in this order: eslint can remove code (e.g unused imports), oxfmt formats last.
// actionlint runs first, same as in `dev-lib check`. It fails fast, and its error line numbers
// match the files, which lint-staged restores to the original state on failure (before oxfmt).
// Sequential order also means actionlint doesn't read a workflow file while oxfmt rewrites it.
// oxlint and oxfmt receive all staged files. They skip the file types they don't support,
// and apply ignorePatterns from their own config, same as `dev-lib check` does.
// This way, lint-staged doesn't need its own list of file extensions, which can get out of sync.
// Don't run them without a file list (on the whole repo): lint-staged stages every tracked file
// that tasks have modified, so unstaged changes in other files would end up in the commit.
const linters = {
  '*': [
    runActionlint,
    oxlintCmd,
    eslintCmd && runEslint,
    stylelintCmd && runStylelint,
    oxfmtCmd,
  ].filter(Boolean),

  // ktlint
  '**/*.{kt,kts}': runKtlint,
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

/**
 * Runs only if a file under .github is staged.
 * actionlint runs without a file list: it checks all workflows, and it never modifies files.
 */
export function runActionlint(match) {
  if (!filterFiles(match, isActionlintFile).length) return []

  if (!canRunBinary('actionlint')) {
    console.log(
      `actionlint is not installed and won't be run.\nThis is how to install it: https://github.com/rhysd/actionlint/blob/main/docs/install.md`,
    )
    return []
  }

  requireActionlintVersion()
  return ['actionlint']
}

function runEslint(match) {
  const files = filterFiles(match, isEslintFile)
  if (!files.length) return []
  return [`${eslintCmd} ${files.join(' ')}`]
}

function runStylelint(match) {
  const files = filterFiles(match, isStylelintFile)
  if (!files.length) return []
  return [`${stylelintCmd} ${files.join(' ')}`]
}

/**
 * lint-staged passes absolute paths, the matcher expects paths relative to cwd.
 */
function filterFiles(match, isMatch) {
  return match.filter(f => isMatch(path.relative(cwd, f)))
}

function getFilesList(match) {
  const isExcluded = picomatch(lintExclude)
  return match.filter(f => !isExcluded(f)).join(' ')
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
