#!/usr/bin/env node

import { json2env } from '../fs/json2env.js'
import { runScript } from '../script/runScript.js'
import { _yargs } from '../yargs/yargs.util.js'

runScript(() => {
  const { argv } = _yargs()
    .demandCommand(1)
    .options({
      prefix: {
        type: 'string',
      },
      saveEnvFile: {
        type: 'boolean',
        desc: 'Save $JSON_FILE_NAME.sh file that exports json vars as environment vars',
        default: true,
      },
      bashEnv: {
        type: 'boolean',
        desc: 'Populate $BASH_ENV file if BASH_ENV env variable exists',
        default: true,
      },
      githubEnv: {
        type: 'boolean',
        desc: 'Populate $GITHUB_ENV file if GITHUB_ENV env variable exists',
        default: true,
      },
      fail: {
        type: 'boolean',
        desc: 'Fail (exit status 1) on non-existing input file',
        default: true,
      },
      debug: {
        type: 'boolean',
      },
      silent: {
        type: 'boolean',
      },
    })

  const { _: args, prefix, saveEnvFile, bashEnv, githubEnv, fail, debug, silent } = argv
  if (debug) console.log({ argv })

  const jsonPath = args[0] as string

  json2env({
    jsonPath,
    prefix,
    saveEnvFile,
    bashEnv,
    githubEnv,
    fail,
    debug,
    silent,
  })
})
