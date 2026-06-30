import { _parseArgs } from '../cli/parseArgs.js'
import { kpySync } from '../fs/kpy.js'
import { runScript } from '../script/runScript.js'

runScript(() => {
  const {
    _: [baseDir, ...inputPatterns],
    ...opt
  } = _parseArgs(
    {
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
        desc: 'Move files instead of copy',
      },
    },
    { minPositionals: 2 },
  )

  const outputDir = inputPatterns.pop()!

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
    baseDir: baseDir!,
    inputPatterns,
    outputDir,
    ...opt,
    noOverwrite: !opt.overwrite,
  }

  kpySync(kpyOpt)
})
