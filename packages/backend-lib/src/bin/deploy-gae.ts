#!/usr/bin/env node

import { runScript } from '@naturalcycles/nodejs-lib'
import { _yargs } from '@naturalcycles/nodejs-lib/yargs'
import { deployGae } from '../deploy/deployGae.js'
import { deployHealthCheckYargsOptions } from '../deploy/deployHealthCheck.js'
import { deployPrepareYargsOptions } from '../deploy/deployPrepare.js'

runScript(async () => {
  const opt = _yargs().options({
    ...deployPrepareYargsOptions,
    ...deployHealthCheckYargsOptions,
  }).argv

  await deployGae(opt)
})
