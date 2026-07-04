import fs from 'node:fs'
import { isAgent } from 'std-env'
import { defineConfig } from 'vitest/config'
import { SummaryReporter } from './summaryReporter.js'
import { VitestAlphabeticSequencer } from './vitestAlphabeticSequencer.js'

export { SummaryReporter } from './summaryReporter.js'
export { CollectReporter } from './collectReporter.js'

const runsInIDE = doesItRunInIDE()
const testType = getTestType(runsInIDE)
const silent = shouldBeSilent(runsInIDE)
const { include, exclude } = getIncludeAndExclude(testType)
const isCI = !!process.env.CI
const coverageEnabled = isCI && testType === 'unit'
const junitReporterEnabled = isCI && testType !== 'manual'
const maxWorkers = getMaxWorkers()
// threads are tested to be ~10% faster than forks in CI (and no change locally)
// UPD: it was not statistically significant, so, reverting back to forks which is more stable
// UPD2: in a different experiment, threads show ~10% faster locally, consistently
const pool = 'threads'

process.env.TZ ||= 'UTC'

if (testType === 'unit') {
  process.env.APP_ENV ||= 'test'
}

if (silent) {
  process.env.TEST_SILENT = 'true'
}

/**
 * Use it like this in your vitest.config.ts:
 *
 * export default defineVitestConfig({
 *   // overrides here, e.g:
 *   // bail: 1,
 * })
 */
export function defineVitestConfig(config, cwd) {
  const mergedConfig = defineConfig({
    ...config,
    test: {
      ...getSharedConfig(cwd),
      ...config?.test,
    },
  })

  const { silent, pool, maxWorkers, isolate } = mergedConfig.test

  // In workspace mode, cwd differs from process.cwd() (which is the monorepo root)
  const isWorkspaceMode = cwd && process.cwd() !== cwd
  if (!isWorkspaceMode) {
    console.log({
      testType,
      silent,
      isCI,
      runsInIDE,
      pool,
      isolate,
      maxWorkers,
    })
  }

  return mergedConfig
}

/**
 * Shared config for Vitest.
 */
export function getSharedConfig(cwd) {
  return {
    pool,
    maxWorkers,
    isolate: false,
    watch: false,
    // dir: 'src',
    restoreMocks: true,
    silent,
    setupFiles: getSetupFiles(testType, cwd),
    logHeapUsage: true,
    testTimeout: 60_000,
    slowTestThreshold: isCI ? 500 : 300, // higher threshold in CI
    sequence: {
      sequencer: VitestAlphabeticSequencer,
      // shuffle: {
      //   files: true,
      //   tests: false,
      // },
      // seed: 1, // this makes the order of tests deterministic (but still not alphabetic)
    },
    include,
    exclude,
    reporters: getReporters(junitReporterEnabled, testType),
    outputFile: getOutputFile(),
    coverage: getCoverageConfig(),
  }
}

function getReporters(junitReporterEnabled, testType) {
  const override = getReporterOverride()
  if (override) return override

  const { GITHUB_ACTIONS } = process.env
  return [
    'default',
    GITHUB_ACTIONS && 'github-actions',
    new SummaryReporter(),
    ...getJunitReporters(junitReporterEnabled, testType),
  ].filter(Boolean)
}

/**
 * Reporters for the monorepo root config (Vitest `projects` mode).
 *
 * `reporters` is a root-only Vitest option: per-project reporters are ignored
 * when running via `projects`. So the per-package SummaryReporter never runs in
 * the aggregate root run, and - crucially - a root-level SummaryReporter sees
 * the test modules of ALL projects at once, letting it report the slowest tests
 * across the entire monorepo.
 *
 * Use it in the root vitest.config.ts:
 *
 * export default defineConfig({
 *   test: {
 *     projects: ['./packages/*'],
 *     reporters: getRootReporters(),
 *   },
 * })
 */
export function getRootReporters() {
  const override = getReporterOverride()
  if (override) return override

  const { GITHUB_ACTIONS } = process.env
  return [
    'default',
    GITHUB_ACTIONS && 'github-actions',
    new SummaryReporter(),
    ...getJunitReporters(junitReporterEnabled, testType),
  ].filter(Boolean)
}

/**
 * `outputFile` for the junit/json reporters at the monorepo root config.
 *
 * Like `reporters`, `outputFile` is a root-only Vitest option: per-project
 * `outputFile` is ignored when running via `projects`. So the root config must
 * set it (alongside getRootReporters) for the junit/json report to be written
 * in the aggregate root run.
 *
 * Use it in the root vitest.config.ts:
 *
 * export default defineConfig({
 *   test: {
 *     projects: ['./packages/*'],
 *     reporters: getRootReporters(),
 *     outputFile: getRootOutputFile(),
 *   },
 * })
 */
export function getRootOutputFile() {
  return getOutputFile()
}

/**
 * `coverage` config for the monorepo root config (Vitest `projects` mode).
 *
 * Like `reporters` and `outputFile`, `coverage` is a root-only Vitest option:
 * it is read from the root project only (see Vitest's `getRootProject().
 * serializedConfig.coverage`), so the per-package `coverage` set in
 * getSharedConfig is IGNORED when running via `projects`. Without this on the
 * root config no coverage report is produced at all (e.g. the CI upload of
 * ./coverage/coverage-summary.json finds nothing).
 *
 * The report is a single, unified one spanning all projects: Vitest tracks
 * coverage per-project internally but emits one report under `./coverage`.
 * Per-project coverage `include` globs are matched unanchored against absolute
 * paths, so executed files under `packages/<pkg>/src/**` are still included.
 *
 * Use it in the root vitest.config.ts:
 *
 * export default defineConfig({
 *   test: {
 *     projects: ['./packages/*'],
 *     reporters: getRootReporters(),
 *     outputFile: getRootOutputFile(),
 *     coverage: getRootCoverage(),
 *   },
 * })
 */
export function getRootCoverage() {
  return getCoverageConfig()
}

/**
 * The coverage config, shared by the per-package (getSharedConfig) and root
 * (getRootCoverage) configs. Only enabled for CI unit-test runs.
 */
function getCoverageConfig() {
  return {
    enabled: coverageEnabled,
    reporter: ['html', 'lcov', 'json', 'json-summary', !isCI && 'text'].filter(Boolean),
    // `**/src/**` (not root-anchored `src/**`) so the report covers `src/` at the
    // repo root AND in every monorepo package (`packages/<pkg>/src/**`). This
    // matters in `projects` mode, where coverage is produced once at the root:
    // a root-anchored glob would list only root `src/` as untested files, and
    // package sources that no test imports would silently drop off the report.
    // Vitest always appends `**/node_modules/**` to exclude, so `**/src/**` is
    // safe. The exclude globs below are likewise `**/`-prefixed so they keep
    // matching inside packages (e.g. `packages/<pkg>/src/test/**`).
    include: ['**/src/**/*.{ts,tsx}'],
    exclude: [
      '**/__exclude/**',
      '**/scripts/**',
      '**/public/**',
      '**/src/index.{ts,tsx}',
      '**/src/test/**',
      '**/src/typings/**',
      '**/src/{env,environment,environments}/**',
      '**/src/bin/**',
      '**/src/vendor/**',
      '**/*.test.*',
      '**/*.script.*',
      '**/*.module.*',
      '**/*.mock.*',
      '**/*.page.{ts,tsx}',
      '**/*.component.{ts,tsx}',
      '**/*.directive.{ts,tsx}',
      '**/*.modal.{ts,tsx}',
    ],
  }
}

/**
 * The junit + json reporters, enabled in CI (except for manual tests).
 * Shared by the per-package (getReporters) and root (getRootReporters) configs.
 */
function getJunitReporters(junitReporterEnabled, testType) {
  if (!junitReporterEnabled) return []
  return [
    'json',
    [
      'junit',
      {
        suiteName: `${testType} tests`,
      },
    ],
  ]
}

/**
 * outputFile location is specified for compatibility with the previous jest config.
 */
function getOutputFile() {
  return junitReporterEnabled
    ? {
        junit: `./tmp/jest/${testType}.xml`,
        json: `./tmp/jest/${testType}.json`,
      }
    : undefined
}

/**
 * Reporter overrides shared by both the per-package and root configs:
 * - VITEST_REPORTER env var fully replaces the reporter set
 * - agents get the compact 'agent' reporter, with no summary
 *
 * Returns `undefined` when no override applies (caller uses its own defaults).
 */
function getReporterOverride() {
  const { VITEST_REPORTER } = process.env
  if (VITEST_REPORTER) {
    return [VITEST_REPORTER]
  }
  if (isAgent) {
    return ['agent']
  }
  return undefined
}

function doesItRunInIDE() {
  // example command line below:
  // /usr/local/bin/node /Users/some/Idea/some/node_modules/vitest/vitest.mjs --run --reporter /Users/some/Library/Application Support/JetBrains/IntelliJIdea2025.2/plugins/javascript-plugin/helpers/vitest-intellij/node_modules/vitest-intellij-reporter-safe.js --testNamePattern=^ ?case 001: empty data$ /Users/some/Idea/some/src/some/some.integration.test.ts
  return process.argv.some(
    a =>
      a === '--runTestsByPath' ||
      a.includes('IDEA') ||
      a.includes('JetBrains') ||
      a.includes('Visual Studio'),
  )
}

function getTestType(runsInIDE) {
  if (runsInIDE) {
    if (process.argv.some(a => a.endsWith('.integration.test.ts'))) {
      return 'integration'
    }
    if (process.argv.some(a => a.endsWith('.manual.test.ts'))) {
      return 'manual'
    }
  }

  return process.env.TEST_TYPE || 'unit'
}

function shouldBeSilent(runsInIDE) {
  if (runsInIDE) {
    return false
  }
  return isRunningAllTests()
}

/**
 * Detects if vitest is run with all tests, or with selected individual tests.
 */
function isRunningAllTests() {
  let vitestArg = false
  let hasPositionalArgs = false
  process.argv.forEach(a => {
    if (a.includes('.bin/vitest')) {
      vitestArg = true
      return
    }
    if (!vitestArg) return
    if (!a.startsWith('-')) {
      hasPositionalArgs = true
    }
  })
  // console.log({vitestArg, hasPositionalArgs}, process.argv)

  return !hasPositionalArgs
}

function getSetupFiles(testType, cwd = process.cwd()) {
  // Set 'setupFiles' only if setup files exist
  const setupFiles = []
  if (fs.existsSync(`${cwd}/src/test/setupVitest.ts`)) {
    setupFiles.push(`${cwd}/src/test/setupVitest.ts`)
  }
  if (fs.existsSync(`${cwd}/src/test/setupVitest.${testType}.ts`)) {
    setupFiles.push(`${cwd}/src/test/setupVitest.${testType}.ts`)
  }
  return setupFiles
}

function getIncludeAndExclude(testType) {
  let include
  const exclude = ['**/__exclude/**']

  if (testType === 'integration') {
    include = ['{src,scripts}/**/*.integration.test.ts']
  } else if (testType === 'manual') {
    include = ['{src,scripts}/**/*.manual.test.ts']
  } else {
    // normal unit test
    include = ['{src,scripts}/**/*.test.ts']
    exclude.push('**/*.{integration,manual}.test.*')
  }

  return { include, exclude }
}

function getMaxWorkers() {
  const cpuLimit = Number(process.env.CPU_LIMIT)
  return cpuLimit || undefined
}
