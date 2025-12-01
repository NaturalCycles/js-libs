import fs from 'node:fs'
import { VitestAlphabeticSequencer } from './vitestAlphabeticSequencer.js'
import { defineConfig } from 'vitest/config'
import { SummaryReporter } from './summaryReporter.js'
export { SummaryReporter } from './summaryReporter.js'
export { CollectReporter } from './collectReporter.js'

const runsInIDE = doesItRunInIDE()
const testType = getTestType(runsInIDE)
const silent = shouldBeSilent(runsInIDE)
const { include, exclude } = getIncludeAndExclude(testType)
const isCI = !!process.env['CI']
const coverageEnabled = isCI && testType === 'unit'
const junitReporterEnabled = isCI && testType !== 'manual'
const maxWorkers = getMaxWorkers()
// threads are tested to be ~10% faster than forks in CI (and no change locally)
// UPD: it was not statistically significant, so, reverting back to forks which is more stable
// UPD2: in a different experiment, threads show ~10% faster locally, consistently
const pool = 'threads'

process.env.TZ ||= 'UTC'

if (testType === 'unit') {
  process.env['APP_ENV'] = process.env['APP_ENV'] || 'test'
}

if (silent) {
  process.env['TEST_SILENT'] = 'true'
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
  const setupFiles = getSetupFiles(testType, cwd)

  const mergedConfig = defineConfig({
    ...config,
    test: {
      ...sharedConfig,
      setupFiles,
      ...config?.test,
    },
  })

  const { silent, pool, maxWorkers, isolate } = mergedConfig.test

  console.log({
    testType,
    silent,
    isCI,
    runsInIDE,
    // include,
    // exclude,
    pool,
    isolate,
    maxWorkers,
    setupFiles,
    cwd,
  })

  return mergedConfig
}

/**
 * Shared config for Vitest.
 */
export const sharedConfig = {
  pool,
  maxWorkers,
  isolate: false,
  watch: false,
  // dir: 'src',
  restoreMocks: true,
  silent,
  setupFiles: getSetupFiles(testType),
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
  reporters: [
    'default',
    new SummaryReporter(),
    junitReporterEnabled && [
      'junit',
      {
        suiteName: `${testType} tests`,
        // classNameTemplate: '{filename} - {classname}',
      },
    ],
  ].filter(Boolean),
  // outputFile location is specified for compatibility with the previous jest config
  outputFile: junitReporterEnabled ? `./tmp/jest/${testType}.xml` : undefined,
  coverage: {
    enabled: coverageEnabled,
    reporter: ['html', 'lcov', 'json', 'json-summary', !isCI && 'text'].filter(Boolean),
    include: ['src/**/*.{ts,tsx}'],
    exclude: [
      '**/__exclude/**',
      'scripts/**',
      'public/**',
      'src/index.{ts,tsx}',
      'src/test/**',
      'src/typings/**',
      'src/{env,environment,environments}/**',
      'src/bin/**',
      'src/vendor/**',
      '**/*.test.*',
      '**/*.script.*',
      '**/*.module.*',
      '**/*.mock.*',
      '**/*.page.{ts,tsx}',
      '**/*.component.{ts,tsx}',
      '**/*.directive.{ts,tsx}',
      '**/*.modal.{ts,tsx}',
    ],
  },
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

  return process.env['TEST_TYPE'] || 'unit'
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

function getSetupFiles(testType, cwd = '.') {
  // Set 'setupFiles' only if setup files exist
  const setupFiles = []
  if (fs.existsSync(`${cwd}/src/test/setupVitest.ts`)) {
    setupFiles.push('./src/test/setupVitest.ts')
  }
  if (fs.existsSync(`${cwd}/src/test/setupVitest.${testType}.ts`)) {
    setupFiles.push(`./src/test/setupVitest.${testType}.ts`)
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
  const cpuLimit = Number(process.env['CPU_LIMIT'])
  return cpuLimit || undefined
}
