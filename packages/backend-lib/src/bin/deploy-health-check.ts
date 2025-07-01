#!/usr/bin/env node

/*

yarn deploy-health-check --url https://service-dot-yourproject.appspot.com

--timeoutSec 30
--intervalSec 2

 */

import { runScript } from '@naturalcycles/nodejs-lib'
import { _yargs } from '@naturalcycles/nodejs-lib/yargs'
import { deployHealthCheck, deployHealthCheckYargsOptions } from '../deploy/deployHealthCheck.js'

runScript(async () => {
  const { url, ...opt } = _yargs().options({
    ...deployHealthCheckYargsOptions,
    url: {
      type: 'string',
      demandOption: true,
    },
  }).argv

  await deployHealthCheck(url, opt)
})
