#!/usr/bin/env node

import yargs from 'yargs'
import { delSync } from '../fs/del'
import { runScript } from '../script/runScript'

runScript(async () => {
  const { _: patterns, ...opt } = yargs.demandCommand(1).options({
    verbose: {
      type: 'boolean',
    },
    silent: {
      type: 'boolean',
    },
    debug: {
      type: 'boolean',
    },
    dry: {
      type: 'boolean',
    },
    concurrency: {
      type: 'number',
    },
  }).argv

  delSync({ patterns: patterns as string[], ...opt })
})
