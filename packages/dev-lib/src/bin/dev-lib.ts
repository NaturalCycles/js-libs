#!/usr/bin/env node
import { select, Separator } from '@inquirer/prompts'
import { _by } from '@naturalcycles/js-lib'
import { _assert } from '@naturalcycles/js-lib/error'
import type { PromisableFunction } from '@naturalcycles/js-lib/types'
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'
import { runScript } from '@naturalcycles/nodejs-lib/runScript'
import { buildCopy, buildProd, runTSCInFolders } from '../build.util.js'
import {
  eslintAll,
  lintAllCommand,
  lintStagedCommand,
  runBiome,
  runCommitlintCommand,
  runPrettier,
  stylelintAll,
} from '../lint.util.js'
import { runTest } from '../test.util.js'

interface Command {
  name: string
  desc?: string
  deprecated?: boolean // if true, will not be shown in interactive mode
  fn: PromisableFunction
  cliOnly?: boolean
  interactiveOnly?: boolean
}

const commands: (Command | Separator)[] = [
  new Separator(), // build
  {
    name: 'typecheck',
    fn: typecheck,
    desc: 'Run typecheck (tsc) in folders (src, scripts, e2e) if there is tsconfig.json present',
  },
  { name: 'bt', fn: bt, desc: 'Build & Test: run "typecheck" (tsc) and then "test".' },
  { name: 'check', fn: lbt, desc: '"Run all possible checks": lint, typecheck, then test.' },
  {
    name: 'build',
    fn: buildProd,
    desc: 'Run "build-copy" then tsc with --emit and --noCheck, using tsconfig.prod.json',
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
  new Separator(), // test
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
  {
    name: 'test-leaks',
    fn: () => runTest({ leaks: true }),
    desc: 'Run vitest --detectLeaks for *.test.ts files.',
  },
  new Separator(), // lint
  {
    name: 'lint',
    fn: lintAllCommand,
    desc: 'Run all linters: eslint, prettier, stylelint, ktlint, actionlint.',
  },
  {
    name: 'lint-staged',
    fn: lintStagedCommand,
    desc: 'Run "lint-staged", which runs linter on git staged files.',
  },
  { name: 'eslint', fn: eslintAll, desc: 'Run eslint on all files.' },
  {
    name: 'eslint --no-fix',
    fn: async () => await eslintAll({ fix: false }),
    desc: 'Run eslint on all files with "auto-fix" disabled. Useful for debugging.',
    interactiveOnly: true,
  },
  {
    name: 'biome',
    fn: () => runBiome(),
    desc: 'Run biome linter on all files.',
  },
  {
    name: 'biome --no-fix',
    fn: () => runBiome(false),
    desc: 'Run biome linter on all files with "auto-fix" disabled. Useful for debugging.',
    interactiveOnly: true,
  },
  { name: 'prettier', fn: runPrettier, desc: 'Run prettier on all files.' },
  { name: 'stylelint', fn: stylelintAll, desc: 'Run stylelint on all files.' },
  { name: 'commitlint', fn: runCommitlintCommand, desc: 'Run commitlint.', cliOnly: true },
  new Separator(), // interactive-only
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

const commandMap = _by(commands.filter(c => !(c instanceof Separator)) as Command[], c => c.name)

const { CI } = process.env

runScript(async () => {
  let cmd = process.argv.find(s => commandMap[s] && !commandMap[s].interactiveOnly)

  if (!cmd) {
    // interactive mode
    _assert(!CI, 'interactive dev-lib should not be run in CI')

    cmd = await select({
      message: 'Select command',
      pageSize: 30,
      choices: commands
        .filter(c => c instanceof Separator || !c.cliOnly)
        .map(c => {
          if (c instanceof Separator) return c
          return {
            value: c.name,
            description: c.desc,
          }
        }),
    })
  }

  await commandMap[cmd]!.fn()
})

async function lbt(): Promise<void> {
  await lintAllCommand()
  await bt()
}

async function bt(): Promise<void> {
  await typecheck()
  runTest()
}

async function typecheck(): Promise<void> {
  await runTSCInFolders(
    ['tsconfig.json', 'scripts/tsconfig.json', 'e2e/tsconfig.json'],
    ['--noEmit'],
  )
}

async function cleanDist(): Promise<void> {
  fs2.emptyDir('./dist') // it doesn't delete the dir itself, to prevent IDE jumping
}

async function cleanBuild(): Promise<void> {
  await cleanDist()
  await buildProd()
}
