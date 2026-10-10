import fs from 'node:fs'
import { isAgent } from 'std-env'
import { defineConfig } from 'vitest/config'
import { SummaryReporter } from './summaryReporter.js'
import { VitestAlphabeticSequencer } from './vitestAlphabeticSequencer.js'

export { SummaryReporter } from './summaryReporter.js'
export { CollectReporter } from './collectReporter.js'

const runsInIDE = doesItRunInIDE()
const testType = getTestType(runsInIDE)
const silent = getSilent(runsInIDE)
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
  // Tells the tests that vitest is suppressing console output, so they keep the output vitest
  // can't intercept quiet too: child process stdio (see exec2.test.ts) and dev-lib's testLogger,
  // which writes to process.stdout directly.
  process.env.TEST_SILENT = 'true'
}

/**
 * Use it like this in your vitest.config.ts:
 *
 * export default defineVitestConfig({
 *   // overrides here, e.g:
 *   // bail: 1,
 * })
 *
 * In a monorepo: use it in the vitest.config.ts of each package (passing `import.meta.dirname`
 * as cwd), and defineVitestMonorepoConfig in the root vitest.config.ts.
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
 * Use it in the ROOT vitest.config.ts of a monorepo (Vitest `projects` mode):
 *
 * export default defineVitestMonorepoConfig({
 *   test: {
 *     projects: ['./packages/*'],
 *     // overrides here, e.g:
 *     // coverage: { enabled: false },
 *   },
 * })
 *
 * In `projects` mode Vitest has two kinds of config: the root config (this one) and the
 * per-project configs (defineVitestConfig in each package). A set of options is root-only:
 * Vitest reads them from the root config only and silently IGNORES the per-project values
 * (see `NonProjectOptions` in Vitest's types): `reporters`, `outputFile`, `coverage`, `silent`,
 * `watch`, `slowTestThreshold`, `sequence.sequencer`, etc.
 *
 * This helper sets the root-only part of the shared config (see getRootConfig) on the root
 * config, where it takes effect. So the junit/json/coverage reports are written, the
 * SummaryReporter reports the slowest tests across ALL projects, and the
 * VitestAlphabeticSequencer is actually used, monorepo-wide.
 */
export function defineVitestMonorepoConfig(config) {
  return defineConfig({
    ...config,
    test: {
      ...getRootConfig(),
      ...config?.test,
    },
  })
}

/**
 * Shared config for Vitest: for a single-package repo, or for one project (package) of a
 * monorepo (pass `import.meta.dirname` as cwd).
 */
export function getSharedConfig(cwd) {
  return {
    // Root-only options. In a single-package repo this config IS the root, so they apply.
    // In a monorepo they are IGNORED here (Vitest reads them from the root config only), so
    // defineVitestMonorepoConfig sets them on the root config instead.
    ...getRootConfig(),
    // Per-project options
    pool,
    maxWorkers,
    isolate: false,
    // dir: 'src',
    restoreMocks: true,
    // restoreMocks does not cover vi.stubEnv/vi.stubGlobal
    unstubEnvs: true,
    unstubGlobals: true,
    setupFiles: getSetupFiles(testType, cwd),
    logHeapUsage: true,
    testTimeout: 60_000,
    hookTimeout: 60_000,
    injectCjsGlobals: false,
    deps: {
      // Disable CJS/ESM interop to match production Node.js behavior.
      // Without this, vitest auto-promotes default exports to named exports,
      // which can mask import bugs (e.g., ejs v4 renderFile issue).
      // Vitest's own default is `true`.
      interopDefault: false,
    },
    include,
    exclude,
  }
}

/**
 * The root-only subset of the shared config: the options Vitest reads from the root config
 * only (`NonProjectOptions` in Vitest's types, plus `sequence.sequencer`), hence the ones that
 * must be set on the root config of a monorepo to take effect there. Shared by getSharedConfig
 * (where they apply in a single-package repo) and defineVitestMonorepoConfig.
 */
function getRootConfig() {
  return {
    watch: false,
    silent,
    slowTestThreshold: isCI ? 500 : 300, // higher threshold in CI
    sequence: {
      sequencer: VitestAlphabeticSequencer,
      // shuffle: {
      //   files: true,
      //   tests: false,
      // },
      // seed: 1, // this makes the order of tests deterministic (but still not alphabetic)
    },
    reporters: getReporters(junitReporterEnabled, testType),
    outputFile: getOutputFile(),
    coverage: getCoverageConfig(),
  }
}

/**
 * @deprecated Use defineVitestMonorepoConfig for the monorepo root config instead. It sets
 * `reporters` together with all the other root-only options (see getRootConfig).
 */
export function getRootReporters() {
  return getReporters(junitReporterEnabled, testType)
}

/**
 * @deprecated Use defineVitestMonorepoConfig for the monorepo root config instead. It sets
 * `outputFile` together with all the other root-only options (see getRootConfig).
 */
export function getRootOutputFile() {
  return getOutputFile()
}

/**
 * @deprecated Use defineVitestMonorepoConfig for the monorepo root config instead. It sets
 * `coverage` together with all the other root-only options (see getRootConfig).
 */
export function getRootCoverage() {
  return getCoverageConfig()
}

/**
 * The reporters, shared by the per-package (getSharedConfig) and the monorepo root
 * (defineVitestMonorepoConfig) configs.
 *
 * In a monorepo (`projects` mode) `reporters` is root-only: per-project reporters are ignored.
 * So the per-package SummaryReporter never runs in the aggregate root run, and - crucially -
 * a root-level SummaryReporter sees the test modules of ALL projects at once, letting it report
 * the slowest tests across the entire monorepo.
 */
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
 * The coverage config, shared by the per-package (getSharedConfig) and the monorepo root
 * (defineVitestMonorepoConfig) configs. Only enabled for CI unit-test runs.
 *
 * In a monorepo (`projects` mode) `coverage` is root-only: it is read from the root project
 * only (see Vitest's `getRootProject().serializedConfig.coverage`), so the per-package
 * `coverage` set in getSharedConfig is IGNORED when running via `projects`. Without it on the
 * root config no coverage report is produced at all (e.g. the CI upload of
 * ./coverage/coverage-summary.json finds nothing).
 *
 * The report is a single, unified one spanning all projects: Vitest tracks coverage per-project
 * internally but emits one report under `./coverage`. Per-project coverage `include` globs are
 * matched unanchored against absolute paths, so executed files under `packages/<pkg>/src/**`
 * are still included.
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
 * Used (via getReporters) by both the per-package and the monorepo root configs.
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

/**
 * Console output of failed tests only, in every CLI run - whether it runs all tests or a single
 * file. Pass `--silent=false` to see the output of passing tests too.
 * In the IDE everything is printed, as IDE runs are interactive debugging.
 */
function getSilent(runsInIDE) {
  if (runsInIDE) return false
  // Vitest applies `--silent=false` to `silent` by itself; mirroring it here keeps TEST_SILENT
  // (see above) in sync, so the output vitest can't intercept is shown as well.
  const silentFalse = process.argv.some(
    (a, i) => a === '--silent=false' || (a === '--silent' && process.argv[i + 1] === 'false'),
  )
  if (silentFalse) return false
  return 'passed-only'
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
