import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { _isTruthy } from '@naturalcycles/js-lib'
import { _uniq } from '@naturalcycles/js-lib/array'
import { _since } from '@naturalcycles/js-lib/datetime/time.util.js'
import { _assert } from '@naturalcycles/js-lib/error/assert.js'
import { _filterFalsyValues } from '@naturalcycles/js-lib/object/object.util.js'
import { semver2 } from '@naturalcycles/js-lib/semver'
import type { AnyObject, SemVerString, UnixTimestampMillis } from '@naturalcycles/js-lib/types'
import { dimGrey, white } from '@naturalcycles/nodejs-lib/colors'
import { exec2 } from '@naturalcycles/nodejs-lib/exec2'
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'
import { kpySync } from '@naturalcycles/nodejs-lib/kpy'
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
 * Every boolean defaults to true, so, by default - everything is being run.
 * Pass false to skip it.
 */
export interface CheckOptions {
  fastLinters?: boolean
  eslint?: boolean
  stylelint?: boolean
  prettier?: boolean
  ktlint?: boolean
  typecheckWithTSC?: boolean
  test?: boolean
}

/**
 * Run all linters.
 *
 * If full=false - the "slow" linters are skipped.
 */
export async function runCheck(opt: CheckOptions = {}): Promise<void> {
  const {
    fastLinters = true,
    eslint = true,
    stylelint = true,
    prettier = true,
    ktlint = true,
    typecheckWithTSC: runTSC = true,
    test = true,
  } = opt
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

  if (fastLinters) {
    // Fast linters (that run in <1 second) go first

    runActionLint()

    runBiome(fix)

    runOxlint(fix)
  }

  // From this point we start the "slow" linters, with ESLint leading the way

  if (eslint) {
    // We run eslint BEFORE Prettier, because eslint can delete e.g unused imports.
    eslintAll({
      fix,
    })
  }

  if (
    stylelint &&
    existsSync(`node_modules/stylelint`) &&
    existsSync(`node_modules/stylelint-config-standard-scss`)
  ) {
    stylelintAll(fix)
  }

  if (prettier) {
    runPrettier({ fix })
  }

  if (ktlint) {
    await runKTLint(fix)
  }

  if (runTSC) {
    await typecheckWithTSC()
  }

  if (test) {
    runTest()
  }

  console.log(`${check(true)}${white(`check`)} ${dimGrey(`took ` + _since(started))}`)

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
  if (!hasOxlintConfig()) {
    console.log('.oxlintrc.json is not found, skipping to run oxlint')
    return
  }

  const oxlintPath = findPackageBinPath('oxlint', 'oxlint')

  exec2.spawn(oxlintPath, {
    name: ['oxlint', !fix && '--no-fix'].filter(Boolean).join(' '),
    args: [
      // '--report-unused-disable-directives', // wrongly reports disabled eslint (not oxlint) rules
      '--max-warnings=0',
      '--type-aware',
      '--type-check',
      fix && '--fix',
      fix && '--fix-suggestions',
      fix && '--fix-dangerously',
    ].filter(_isTruthy),
    shell: false,
  })
}

export function requireOxlintConfig(): void {
  _assert(hasOxlintConfig(), '.oxlintrc.json config is not found')
}

export function hasOxlintConfig(): boolean {
  const oxlintConfigPath = `.oxlintrc.json`
  return existsSync(oxlintConfigPath)
}

const prettierPaths = [
  // Everything inside these folders
  `./{${prettierDirs.join(',')}}/**/*.{${prettierExtensionsAll}}`,

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
  `./{${prettierDirs.join(',')}}/**/*.{${stylelintExtensions}}`,

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

export async function buildProd(): Promise<void> {
  // fs2.emptyDir('./dist') // it doesn't delete the dir itself, to prevent IDE jumping
  buildCopy()
  await runTSCProd()
}

export async function typecheckWithTSC(): Promise<void> {
  // todo: try tsgo
  await runTSCInFolders(['src', 'scripts', 'e2e'], ['--noEmit'])
}

/**
 * Use 'src' to indicate root.
 */
export async function runTSCInFolders(
  dirs: string[],
  args: string[] = [],
  parallel = true,
): Promise<void> {
  if (parallel) {
    await Promise.all(dirs.map(dir => runTSCInFolder(dir, args)))
  } else {
    for (const dir of dirs) {
      await runTSCInFolder(dir, args)
    }
  }
}

/**
 * Pass 'src' to run in root.
 */
async function runTSCInFolder(dir: string, args: string[] = []): Promise<void> {
  let configDir = dir
  if (dir === 'src') {
    configDir = ''
  }
  const tsconfigPath = [configDir, 'tsconfig.json'].filter(Boolean).join('/')

  if (!fs2.pathExists(tsconfigPath) || !fs2.pathExists(dir)) {
    // console.log(`Skipping to run tsc for ${tsconfigPath}, as it doesn't exist`)
    return
  }

  const tscPath = findPackageBinPath('typescript', 'tsc')
  const cacheLocation = `node_modules/.cache/${dir}.tsbuildinfo`
  const cacheFound = existsSync(cacheLocation)
  console.log(dimGrey(`${check(cacheFound)}tsc ${dir} cache found: ${cacheFound}`))

  await exec2.spawnAsync(tscPath, {
    args: ['-P', tsconfigPath, ...args],
    shell: false,
  })
}

export async function runTSCProd(args: string[] = []): Promise<void> {
  const tsconfigPath = [`./tsconfig.prod.json`].find(p => fs2.pathExists(p)) || 'tsconfig.json'

  const tscPath = findPackageBinPath('typescript', 'tsc')

  await exec2.spawnAsync(tscPath, {
    args: ['-P', tsconfigPath, '--noEmit', 'false', '--noCheck', '--incremental', 'false', ...args],
    shell: false,
  })
}

export function buildCopy(): void {
  const baseDir = 'src'
  const inputPatterns = [
    '**',
    '!**/*.ts',
    '!**/__snapshots__',
    '!**/__exclude',
    '!test',
    '!**/*.test.js',
  ]
  const outputDir = 'dist'

  kpySync({
    baseDir,
    inputPatterns,
    outputDir,
    dotfiles: true,
  })
}

interface RunTestOptions {
  integration?: boolean
  manual?: boolean
  leaks?: boolean
}

export function runTest(opt: RunTestOptions = {}): void {
  // if (nodeModuleExists('vitest')) {
  if (fs2.pathExists('vitest.config.ts')) {
    runVitest(opt)
    return
  }

  console.log(dimGrey(`vitest.config.ts not found, skipping tests`))
}

function runVitest(opt: RunTestOptions): void {
  const { integration, manual } = opt
  const processArgs = process.argv.slice(3)
  const args: string[] = [...processArgs]
  const env: AnyObject = {}
  if (integration) {
    Object.assign(env, {
      TEST_TYPE: 'integration',
    })
  } else if (manual) {
    Object.assign(env, {
      TEST_TYPE: 'manual',
    })
  }

  const vitestPath = findPackageBinPath('vitest', 'vitest')

  exec2.spawn(vitestPath, {
    args: _uniq(args),
    logFinish: false,
    shell: false,
    env,
  })
}

/**
 * Returns true if module with given name exists in _target project's_ node_modules.
 */
// function nodeModuleExists(moduleName: string): boolean {
//   return existsSync(`./node_modules/${moduleName}`)
// }

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
