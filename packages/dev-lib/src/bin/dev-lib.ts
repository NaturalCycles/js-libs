#!/usr/bin/env node
import { _by } from '@naturalcycles/js-lib/array/array.util.js'
import { _assert } from '@naturalcycles/js-lib/error/assert.js'
import type { PromisableFunction } from '@naturalcycles/js-lib/types'
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'
import { runScript } from '@naturalcycles/nodejs-lib/runScript'
import {
  buildCopy,
  buildProd,
  eslintAll,
  lintStagedCommand,
  runCheck,
  runOxfmt,
  runOxlint,
  runTest,
  stylelintAll,
  typecheckWithTS,
  typecheckWithTSC,
  typecheckWithTSGO,
} from '../check.util.js'
import { runCommitlint } from '../commitlint.js'

interface Command {
  name: string
  desc?: string
  fn: PromisableFunction
  cliOnly?: boolean // if true, will not be shown in interactive mode
  interactiveOnly?: boolean
}

const commands: Command[] = [
  { name: 'check', fn: runCheck, desc: '"Run all possible checks": lint, typecheck, then test.' },
  {
    name: 'quick-check',
    fn: quickCheck,
    desc: 'Like check, but without slow parts, to perform preliminary checks',
  },
  { name: 'bt', fn: bt, desc: 'Build & Test: run "typecheck" and then "test".' },
  {
    name: 'typecheck',
    fn: typecheckWithTS,
    desc: 'Run typecheck via tsgo (if available) or tsc',
  },
  {
    name: 'typecheck-with-tsc',
    fn: typecheckWithTSC,
    desc: 'Run typecheck (tsc) in folders (src, scripts, e2e) if there is tsconfig.json present.',
  },
  {
    name: 'typecheck-with-tsgo',
    fn: typecheckWithTSGO,
    desc: 'Run typecheck (tsgo) in folders (src, scripts, e2e) if there is tsconfig.json present.',
  },
  {
    name: 'build',
    fn: buildProd,
    desc: 'Run "build-copy" then tsgo with --emit and --noCheck, using tsconfig.prod.json',
  },
  {
    name: 'build-copy',
    fn: buildCopy,
    desc: 'Copy the non-ts files from ./src to ./dist',
  },
  {
    name: 'clean',
    fn: cleanDist,
    desc: 'Clean ./dist',
  },
  {
    name: 'clean-build',
    fn: cleanBuild,
    desc: 'Cleans ./dist, then runs the build.',
  },
  { name: 'test', fn: runTest, desc: 'Run vitest for *.test.ts files.' },
  {
    name: 'test-integration',
    fn: () => runTest({ integration: true }),
    desc: 'Run vitest for *.integration.test.ts files.',
  },
  {
    name: 'test-manual',
    fn: () => runTest({ manual: true }),
    desc: 'Run vitest for *.manual.test.ts files.',
  },
  // {
  //   name: 'test-leaks',
  //   fn: () => runTest({ leaks: true }),
  //   desc: 'Run vitest --detectLeaks for *.test.ts files.',
  // },
  {
    name: 'lint',
    fn: () =>
      runCheck({
        typecheck: false,
        test: false,
      }),
    desc: 'Run all linters: eslint, oxfmt, stylelint, ktlint, actionlint.',
  },
  {
    name: 'lint-staged',
    fn: lintStagedCommand,
    desc: 'Run "lint-staged", which runs linter on git staged files.',
  },
  { name: 'eslint', fn: eslintAll, desc: 'Run eslint on all files.' },
  { name: 'eslint-no-fix', cliOnly: true, fn: () => eslintAll({ fix: false }) },
  {
    name: 'eslint --no-fix',
    fn: () => eslintAll({ fix: false }),
    desc: 'Run eslint on all files with "auto-fix" disabled. Useful for debugging.',
    interactiveOnly: true,
  },
  { name: 'oxlint', fn: runOxlint, desc: 'Run oxlint on all files.' },
  { name: 'oxlint-no-fix', cliOnly: true, fn: () => runOxlint(false) },
  {
    name: 'oxlint --no-fix',
    fn: () => runOxlint(false),
    desc: 'Run oxlint on all files with "auto-fix" disabled. Useful for debugging.',
    interactiveOnly: true,
  },
  { name: 'oxfmt', fn: runOxfmt, desc: 'Run oxfmt on all files.' },
  { name: 'stylelint', fn: stylelintAll, desc: 'Run stylelint on all files.' },
  {
    name: 'stylelint --no-fix',
    fn: () => stylelintAll(false),
    desc: 'Run stylelint with auto-fix disabled.',
  },
  { name: 'stylelint-no-fix', cliOnly: true, fn: () => stylelintAll(false) },
  { name: 'commitlint', fn: runCommitlint, desc: 'Run commitlint.', cliOnly: true },
  {
    name: 'exit',
    fn: () => console.log('see you!'),
    desc: 'Do nothing and exit.',
    interactiveOnly: true,
  },
  // currently disabled
  // build-copy is excluded
  // init: initFromDevLibCommand, // todo: reimplement!
  // 'update-from-dev-lib': () => {
  //   // todo: reimplement, name it `sync` maybe?
  //   kpySync({
  //     baseDir: cfgOverwriteDir,
  //     outputDir: './',
  //     dotfiles: true,
  //     verbose: true,
  //   })
  // },
]

const commandMap = _by(commands, c => c.name)

const { CI } = process.env

runScript(async () => {
  let cmd = process.argv.find(s => commandMap[s] && !commandMap[s].interactiveOnly)

  if (!cmd) {
    // interactive mode
    _assert(!CI, 'interactive dev-lib should not be run in CI')

    const { default: prompts } = await import('prompts')

    const response = await prompts({
      type: 'select',
      name: 'cmd',
      message: 'Select command',
      // @ts-expect-error types are wrong
      optionsPerPage: 30,
      choices: commands
        .filter(c => !c.cliOnly)
        .map(c => ({
          title: c.name,
          value: c.name,
          description: c.desc,
        })),
    })
    cmd = response.cmd
    if (!cmd) return // user cancelled
  }

  await commandMap[cmd]!.fn()
})

async function quickCheck(): Promise<void> {
  await runCheck({
    eslint: false,
    oxfmt: false,
    stylelint: false,
    typecheck: false,
  })
}

async function bt(): Promise<void> {
  // Still using ts, as oxlint is found to fail in certain cases
  // await typecheckWithOxlint()
  await typecheckWithTS()
  runTest()
}

// async function _typecheckWithOxlint(): Promise<void> {
//   requireOxlintConfig()
//   const fix = !CI
//   runOxlint(fix)
// }

async function cleanBuild(): Promise<void> {
  cleanDist()
  buildProd()
}

function cleanDist(): void {
  fs2.emptyDir('./dist') // it doesn't delete the dir itself, to prevent IDE jumping
}
