import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { _isTruthy } from '@naturalcycles/js-lib'
import { _since } from '@naturalcycles/js-lib/datetime/time.util.js'
import { _assert } from '@naturalcycles/js-lib/error/assert.js'
import { _filterFalsyValues } from '@naturalcycles/js-lib/object/object.util.js'
import { semver2 } from '@naturalcycles/js-lib/semver'
import type { SemVerString, UnixTimestampMillis } from '@naturalcycles/js-lib/types'
import { git2 } from '@naturalcycles/nodejs-lib'
import { dimGrey, white } from '@naturalcycles/nodejs-lib/colors'
import { exec2 } from '@naturalcycles/nodejs-lib/exec2'
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'
import { _yargs } from '@naturalcycles/nodejs-lib/yargs'
import {
  eslintExtensions,
  lintExclude,
  minActionlintVersion,
  prettierDirs,
  prettierExtensionsAll,
  stylelintExtensions,
} from '../cfg/_cnst.js'
import { cfgDir } from './paths.js'

const { CI, ESLINT_CONCURRENCY } = process.env

/**
 * Run all linters.
 */
export async function lintAllCommand(): Promise<void> {
  const started = Date.now() as UnixTimestampMillis
  // const { commitOnChanges, failOnChanges } = _yargs().options({
  //   commitOnChanges: {
  //     type: 'boolean',
  //     default: false,
  //   },
  //   failOnChanges: {
  //     type: 'boolean',
  //     default: false,
  //   },
  // }).argv

  // const needToTrackChanges = commitOnChanges || failOnChanges
  // const gitStatusAtStart = gitStatus()
  // if (needToTrackChanges && gitStatusAtStart) {
  //   console.log('lint-all: git shows changes before run:')
  //   console.log(gitStatusAtStart)
  // }

  // In CI, Github Actions doesn't allow us to push and then run CI on changes again
  // (known limitation / "infinite run loop" prevention)
  // That's why we run in "no-fix" mode in CI, and "fix" mode locally
  const fix = !CI

  // Fast linters (that run in <1 second) go first

  runActionLint()

  runOxlint(fix)

  runBiome(fix)

  // From this point we start the "slow" linters, with ESLint leading the way

  // We run eslint BEFORE Prettier, because eslint can delete e.g unused imports.
  eslintAll({
    fix,
  })

  if (
    existsSync(`node_modules/stylelint`) &&
    existsSync(`node_modules/stylelint-config-standard-scss`)
  ) {
    stylelintAll(fix)
  }

  runPrettier({ fix })

  await runKTLint(fix)

  console.log(`${check(true)}${white(`lint-all`)} ${dimGrey(`took ` + _since(started))}`)

  // if (needToTrackChanges) {
  //   const gitStatusAfter = gitStatus()
  //   const hasChanges = gitStatusAfter !== gitStatusAtStart
  //   if (!hasChanges) return
  //   const msg =
  //     'style(ci): ' + _truncate(git2.commitMessageToTitleMessage(git2.getLastGitCommitMsg()), 60)
  //
  //   // pull, commit, push changes
  //   git2.pull()
  //   git2.commitAll(msg)
  //   git2.push()
  //
  //   // fail on changes
  //   if (failOnChanges) {
  //     console.log(gitStatusAfter)
  //     console.log('lint-all failOnChanges: exiting with status 1')
  //     process.exitCode = 1
  //   }
  // }
}

interface EslintAllOptions {
  ext?: string
  fix?: boolean
}

/**
 * Runs `eslint` command for all predefined paths (e.g /src, /scripts, etc).
 */
export function eslintAll(opt?: EslintAllOptions): void {
  const { argv } = _yargs().options({
    ext: {
      type: 'string',
      default: eslintExtensions,
    },
    fix: {
      type: 'boolean',
      default: !CI, // defaults to false in CI, true otherwise
    },
  })

  const { ext, fix } = {
    ...argv,
    ...opt,
  }

  const extensions = ext.split(',')

  runESLint(extensions, fix)
}

function runESLint(extensions = eslintExtensions.split(','), fix = true): void {
  const eslintConfigPath = `eslint.config.js`
  if (!existsSync(eslintConfigPath)) {
    // faster to bail-out like this
    return
  }

  // const tsconfigRootDir = [cwd, configDir !== '.' && configDir].filter(Boolean).join('/')
  const eslintPath = findPackageBinPath('eslint', 'eslint')
  const cacheLocation = `node_modules/.cache/eslint`
  const cacheFound = existsSync(cacheLocation)
  console.log(dimGrey(`${check(cacheFound)}eslint cache found: ${cacheFound}`))

  exec2.spawn(eslintPath, {
    name: ['eslint', !fix && '--no-fix'].filter(Boolean).join(' '),
    args: [
      '--config',
      eslintConfigPath,
      `{src,scripts,e2e}/**/*.{${extensions.join(',')}}`,
      // `--parser-options=project:${tsconfigPath}`,
      // The next line fixes the `typescript-eslint` 8.37 bug of resolving tsconfig.json
      // `--parser-options=tsconfigRootDir:${tsconfigRootDir}`,
      ESLINT_CONCURRENCY && `--concurrency=${ESLINT_CONCURRENCY}`,
      '--cache',
      '--cache-location',
      cacheLocation,
      '--no-error-on-unmatched-pattern',
      fix ? '--fix' : '--no-fix',
    ].filter(_isTruthy),
    shell: false,
    env: _filterFalsyValues({
      // Print eslint plugin timing, but only in CI
      TIMING: CI ? 'true' : '',
    }),
  })
}

export function runOxlint(fix = true): void {
  const oxlintConfigPath = `.oxlintrc.json`
  if (!existsSync(oxlintConfigPath)) {
    return
  }

  const oxlintPath = findPackageBinPath('oxlint', 'oxlint')

  exec2.spawn(oxlintPath, {
    name: ['oxlint', !fix && '--no-fix'].filter(Boolean).join(' '),
    args: [
      // '--report-unused-disable-directives',
      '--max-warnings=1',
      fix && '--fix --fix-suggestions',
    ].filter(_isTruthy),
    shell: false,
  })
}

const prettierPaths = [
  // Everything inside these folders
  `./{${prettierDirs}}/**/*.{${prettierExtensionsAll}}`,

  // Root
  `./*.{${prettierExtensionsAll}}`,

  // Exclude
  ...lintExclude.map((s: string) => `!${s}`),
]

interface RunPrettierOptions {
  experimentalCli?: boolean // default: true
  fix?: boolean // default: write
}

export function runPrettier(opt: RunPrettierOptions = {}): void {
  let { experimentalCli = true, fix = true } = opt
  const prettierConfigPath = [`./prettier.config.js`].find(f => existsSync(f))
  if (!prettierConfigPath) return

  const prettierPath = findPackageBinPath('prettier', 'prettier')
  const cacheLocation = 'node_modules/.cache/prettier'
  const cacheFound = existsSync(cacheLocation)
  console.log(dimGrey(`${check(cacheFound)}prettier cache found: ${cacheFound}`))

  if (hasPrettierOverrides()) {
    experimentalCli = false
    console.log('   prettier experimental mode disabled due to "overrides" in prettier.config.js')
  }

  // prettier --write 'src/**/*.{js,ts,css,scss,graphql}'
  exec2.spawn(prettierPath, {
    name: fix ? 'prettier' : 'prettier --check',
    args: [
      fix ? `--write` : '--check',
      `--log-level=warn`,
      // non-experimental-cli has different cache format, hence disabling it
      experimentalCli && '--cache-location',
      experimentalCli && cacheLocation,
      experimentalCli && `--experimental-cli`,
      experimentalCli ? '--config-path' : `--config`,
      prettierConfigPath,
      ...prettierPaths,
    ].filter(_isTruthy),
    shell: false,
  })
}

const stylelintPaths = [
  // Everything inside these folders
  `./{${prettierDirs}}/**/*.{${stylelintExtensions}}`,

  // Exclude
  ...lintExclude.map((s: string) => `!${s}`),
]

export function stylelintAll(fix?: boolean): void {
  const argv = _yargs().options({
    fix: {
      type: 'boolean',
      default: !CI, // defaults to false in CI, true otherwise
    },
  }).argv

  fix ??= argv.fix

  const config = [`./stylelint.config.js`].find(f => existsSync(f))
  if (!config) return

  // stylelint is never hoisted from dev-lib, so, no need to search for its path
  exec2.spawn('stylelint', {
    name: fix ? 'stylelint' : 'stylelint --no-fix',
    args: [fix ? `--fix` : '', `--allow-empty-input`, `--config`, config, ...stylelintPaths].filter(
      Boolean,
    ),
    shell: false,
  })
}

export async function lintStagedCommand(): Promise<void> {
  const localConfig = `./lint-staged.config.js`
  const sharedConfig = `${cfgDir}/lint-staged.config.js`
  const config = existsSync(localConfig) ? localConfig : sharedConfig

  const { default: lintStaged } = await import('lint-staged')
  const success = await lintStaged({
    configPath: config,
  })

  if (!success) process.exit(3)
}

export function runCommitlintCommand(): void {
  const editMsg = process.argv.at(-1) || '.git/COMMIT_EDITMSG'
  // console.log(editMsg)

  const cwd = process.cwd()
  const localConfig = `${cwd}/commitlint.config.js`
  const sharedConfig = `${cfgDir}/commitlint.config.js`
  const config = existsSync(localConfig) ? localConfig : sharedConfig

  const env = {
    GIT_BRANCH: git2.getCurrentBranchName(),
  }

  const commitlintPath = findPackageBinPath('@commitlint/cli', 'commitlint')

  exec2.spawn(`${commitlintPath} --edit ${editMsg} --config ${config}`, {
    env,
    passProcessEnv: true, // important to pass it through, to preserve $PATH
    forceColor: false,
    log: false,
  })
}

async function runKTLint(fix = true): Promise<void> {
  if (!existsSync(`node_modules/@naturalcycles/ktlint`)) return
  // @ts-expect-error ktlint is not installed (due to size in node_modules), but it's ok
  const { ktlintAll } = await import('@naturalcycles/ktlint')
  await ktlintAll(fix ? ['-F'] : [])
}

function runActionLint(): void {
  // Only run if there is a folder of `.github/workflows`, otherwise actionlint will fail
  if (!existsSync('.github/workflows')) return

  if (canRunBinary('actionlint')) {
    requireActionlintVersion()
    exec2.spawn(`actionlint`)
  } else {
    console.log(
      `actionlint is not installed and won't be run.\nThis is how to install it: https://github.com/rhysd/actionlint/blob/main/docs/install.md`,
    )
  }
}

export function requireActionlintVersion(): void {
  const version = getActionLintVersion()
  if (!version) {
    return
  }

  _assert(
    semver2(version).isSameOrAfter(minActionlintVersion),
    `actionlint needs to be updated. Min accepted version: ${minActionlintVersion}, local version: ${version}\nThis is how to install/update it: https://github.com/rhysd/actionlint/blob/main/docs/install.md`,
  )
}

export function getActionLintVersion(): SemVerString | undefined {
  if (!canRunBinary('actionlint')) return
  return exec2.exec('actionlint --version').split('\n')[0]
}

export function runBiome(fix = true): void {
  const configPath = `biome.jsonc`
  if (!existsSync(configPath)) {
    console.log(`biome is skipped, because ./biome.jsonc is not present`)
    return
  }

  const biomePath = findPackageBinPath('@biomejs/biome', 'biome')
  const dirs = [`src`, `scripts`, `e2e`].filter(d => existsSync(d))

  exec2.spawn(biomePath, {
    name: fix ? 'biome' : 'biome --no-fix',
    args: [`lint`, fix && '--write', fix && '--unsafe', '--no-errors-on-unmatched', ...dirs].filter(
      _isTruthy,
    ),
    shell: false,
  })
}

function canRunBinary(name: string): boolean {
  try {
    execSync(`which ${name}`)
    return true
  } catch {
    return false
  }
}

// function gitStatus(): string | undefined {
//   try {
//     return execSync('git status -s', {
//       encoding: 'utf8',
//     })
//   } catch {}
// }

const require = createRequire(import.meta.url)

export function findPackageBinPath(pkg: string, cmd: string): string {
  const packageJsonPath = require.resolve(`${pkg}/package.json`)
  const { bin } = fs2.readJson<any>(packageJsonPath)

  return path.join(path.dirname(packageJsonPath), typeof bin === 'string' ? bin : bin[cmd])
}

function hasPrettierOverrides(): boolean {
  try {
    return fs2.readText('prettier.config.js').includes('overrides')
  } catch {
    return false
  }
}

function check(predicate: any): string {
  return predicate ? ' ✓ ' : '   '
}
