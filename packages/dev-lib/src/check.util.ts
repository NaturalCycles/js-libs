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
import { _stringMapEntries } from '@naturalcycles/js-lib/types'
import type {
  AnyObject,
  NumberOfMilliseconds,
  SemVerString,
  StringMap,
  UnixTimestampMillis,
} from '@naturalcycles/js-lib/types'
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
  oxfmt?: boolean
  ktlint?: boolean
  /**
   * true - run tsgo, otherwise tsc
   * tsgo - run tsgo
   * tsc - run tsc
   * false - skip
   */
  typecheck?: boolean | 'tsc' | 'tsgo'
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
    oxfmt = true,
    ktlint = true,
    typecheck = true,
    test = true,
  } = opt
  const started = Date.now() as UnixTimestampMillis
  let s: number
  const timings: StringMap<NumberOfMilliseconds> = {}
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

    s = Date.now()
    if (runBiome(fix)) {
      timings['biome'] = Date.now() - s
    }

    s = Date.now()
    if (runOxlint(fix)) {
      timings['oxlint'] = Date.now() - s
    }
  }

  // From this point we start the "slow" linters, with ESLint leading the way

  if (eslint) {
    // We run eslint BEFORE Prettier, because eslint can delete e.g unused imports.
    s = Date.now()
    if (eslintAll({ fix })) {
      timings['eslint'] = Date.now() - s
    }
  }

  if (
    stylelint &&
    hasDependencyInNodeModules('stylelint') &&
    hasDependencyInNodeModules('stylelint-config-standard-scss')
  ) {
    s = Date.now()
    if (stylelintAll(fix)) {
      timings['stylelint'] = Date.now() - s
    }
  }

  if (oxfmt) {
    s = Date.now()
    if (runOxfmt(fix)) {
      timings['oxfmt'] = Date.now() - s
    }
  }

  if (ktlint) {
    s = Date.now()
    if (await runKTLint(fix)) {
      timings['ktlint'] = Date.now() - s
    }
  }

  if (typecheck) {
    s = Date.now()
    if (typecheck === 'tsgo') {
      await typecheckWithTSGO()
      timings['tsgo'] = Date.now() - s
    } else if (typecheck === 'tsc') {
      await typecheckWithTSC()
      timings['tsc'] = Date.now() - s
    } else {
      await typecheckWithTS()
      timings['typecheck'] = Date.now() - s
    }
  }

  if (test) {
    s = Date.now()
    if (runTest()) {
      timings['test'] = Date.now() - s
    }
  }

  console.log(`${check(true)}${white(`check`)} ${dimGrey(`took ` + _since(started))}`)
  for (const [job, ms] of _stringMapEntries(timings)) {
    console.log(`${job.padStart(12, ' ')}: ${String(ms).padStart(5, ' ')} ms`)
  }

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
 *
 * Returns true if it ran
 */
export function eslintAll(opt?: EslintAllOptions): boolean {
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

  return runESLint(extensions, fix)
}

/**
 * Returns true if it ran.
 */
function runESLint(extensions = eslintExtensions.split(','), fix = true): boolean {
  const eslintConfigPath = `eslint.config.js`
  if (!existsSync(eslintConfigPath)) {
    // faster to bail-out like this
    return false
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
  return true
}

/**
 * Returns true if it ran.
 */
export function runOxlint(fix = true): boolean {
  if (!hasOxlintConfig()) {
    console.log('.oxlintrc.json is not found, skipping to run oxlint')
    return false
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
  return true
}

/**
 * Returns true if it ran.
 */
export function runOxfmt(fix = true): boolean {
  if (!hasOxfmtConfig()) {
    console.log('.oxfmtrc.json(c) is not found, skipping to run oxfmt')
    return false
  }

  const oxlintPath = findPackageBinPath('oxfmt', 'oxfmt')

  exec2.spawn(oxlintPath, {
    name: ['oxfmt', !fix && '--check'].filter(Boolean).join(' '),
    args: [!fix && '--check', '--no-error-on-unmatched-pattern'].filter(_isTruthy),
    shell: false,
  })
  return true
}

export function requireOxlintConfig(): void {
  _assert(hasOxlintConfig(), '.oxlintrc.json config is not found')
}

export function hasOxlintConfig(): boolean {
  const oxlintConfigPath = `.oxlintrc.json`
  return existsSync(oxlintConfigPath)
}

export function hasOxfmtConfig(): boolean {
  return ['.oxfmtrc.jsonc', '.oxfmtrc.json'].some(existsSync)
}

const stylelintPaths = [
  // Everything inside these folders
  `./{${prettierDirs.join(',')}}/**/*.{${stylelintExtensions}}`,

  // Exclude
  ...lintExclude.map((s: string) => `!${s}`),
]

/**
 * Returns true if it ran.
 */
export function stylelintAll(fix?: boolean): boolean {
  const argv = _yargs().options({
    fix: {
      type: 'boolean',
      default: !CI, // defaults to false in CI, true otherwise
    },
  }).argv

  fix ??= argv.fix

  const config = [`./stylelint.config.js`].find(f => existsSync(f))
  if (!config) {
    return false
  }

  // stylelint is never hoisted from dev-lib, so, no need to search for its path
  exec2.spawn('stylelint', {
    name: fix ? 'stylelint' : 'stylelint --no-fix',
    args: [fix ? `--fix` : '', `--allow-empty-input`, `--config`, config, ...stylelintPaths].filter(
      Boolean,
    ),
    shell: false,
  })
  return true
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

/**
 * Returns true if it ran.
 */
async function runKTLint(fix = true): Promise<boolean> {
  if (!existsSync(`node_modules/@naturalcycles/ktlint`)) {
    return false
  }
  // @ts-expect-error ktlint is not installed (due to size in node_modules), but it's ok
  const { ktlintAll } = await import('@naturalcycles/ktlint')
  await ktlintAll(fix ? ['-F'] : [])
  return true
}

/**
 * Returns true if it ran.
 */
function runActionLint(): boolean {
  // Only run if there is a folder of `.github/workflows`, otherwise actionlint will fail
  if (!existsSync('.github/workflows')) {
    return false
  }

  if (canRunBinary('actionlint')) {
    requireActionlintVersion()
    exec2.spawn(`actionlint`)
    return true
  }

  console.log(
    `actionlint is not installed and won't be run.\nThis is how to install it: https://github.com/rhysd/actionlint/blob/main/docs/install.md`,
  )
  return false
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

/**
 * Returns true if it ran.
 */
export function runBiome(fix = true): boolean {
  const configPath = `biome.jsonc`
  if (!existsSync(configPath)) {
    console.log(`biome is skipped, because ./biome.jsonc is not present`)
    return false
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
  return true
}

export async function buildProd(): Promise<void> {
  // fs2.emptyDir('./dist') // it doesn't delete the dir itself, to prevent IDE jumping
  buildCopy()
  await runTSCProd()
}

/**
 * Uses tsgo if it's installed, otherwise tsc
 */
export async function typecheckWithTS(): Promise<void> {
  if (hasDependencyInNodeModules('@typescript/native-preview')) {
    await typecheckWithTSGO()
    return
  }

  await typecheckWithTSC()
}

export async function typecheckWithTSC(): Promise<void> {
  await runTSCInFolders(['src', 'scripts', 'e2e'], ['--noEmit'])
}

export async function typecheckWithTSGO(): Promise<void> {
  await runTSGOInFolders(['src', 'scripts', 'e2e'], ['--noEmit', '--incremental', 'false'])
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

/**
 * Use 'src' to indicate root.
 */
export async function runTSGOInFolders(dirs: string[], args: string[] = []): Promise<void> {
  // Run sequential, since tsgo (unlike tsc) uses all cpu cores already
  for (const dir of dirs) {
    await runTSGOInFolder(dir, args)
  }
}

/**
 * Pass 'src' to run in root.
 */
async function runTSGOInFolder(dir: string, args: string[] = []): Promise<void> {
  let configDir = dir
  if (dir === 'src') {
    configDir = ''
  }
  const tsconfigPath = [configDir, 'tsconfig.json'].filter(Boolean).join('/')

  if (!fs2.pathExists(tsconfigPath) || !fs2.pathExists(dir)) {
    // console.log(`Skipping to run tsgo for ${tsconfigPath}, as it doesn't exist`)
    return
  }

  const tsgoPath = findPackageBinPath('@typescript/native-preview', 'tsgo')

  await exec2.spawnAsync(tsgoPath, {
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

/**
 * Returns true if it ran.
 */
export function runTest(opt: RunTestOptions = {}): boolean {
  // if (nodeModuleExists('vitest')) {
  if (fs2.pathExists('vitest.config.ts')) {
    runVitest(opt)
    return true
  }

  console.log(dimGrey(`vitest.config.ts not found, skipping tests`))
  return false
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

function hasDependencyInNodeModules(name: string): boolean {
  return existsSync(`node_modules/${name}`)
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

function check(predicate: any): string {
  return predicate ? ' ✓ ' : '   '
}
