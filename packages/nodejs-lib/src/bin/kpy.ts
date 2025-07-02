#!/usr/bin/env node

import { kpySync } from '../fs/kpy.js'
import { runScript } from '../script/runScript.js'
import { _yargs } from '../yargs/yargs.util.js'

runScript(() => {
  const {
    _: [baseDir, ...inputPatterns],
    ...opt
  } = _yargs()
    .demandCommand(2)
    .options({
      silent: {
        type: 'boolean',
        desc: 'Suppress all text output',
      },
      verbose: {
        type: 'boolean',
        desc: 'Report progress on every file',
      },
      overwrite: {
        type: 'boolean',
        default: true,
      },
      dotfiles: {
        type: 'boolean',
      },
      flat: {
        type: 'boolean',
      },
      dry: {
        type: 'boolean',
      },
      move: {
        type: 'boolean',
        descr: 'Move files instead of copy',
      },
    }).argv

  const outputDir = inputPatterns.pop() as string

  /*
  console.log({
    argv: process.argv,
    baseDir,
    inputPatterns,
    outputDir,
    silent,
    overwrite,
  })*/

  const kpyOpt = {
    baseDir: baseDir as string,
    inputPatterns: inputPatterns as string[],
    outputDir,
    ...opt,
    noOverwrite: !opt.overwrite,
  }

  kpySync(kpyOpt)
})
