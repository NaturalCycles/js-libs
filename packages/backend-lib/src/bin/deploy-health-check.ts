/*

yarn deploy-health-check --url https://service-dot-yourproject.appspot.com

--timeoutSec 30
--intervalSec 2

 */

import { _parseArgs } from '@naturalcycles/nodejs-lib/args'
import { runScript } from '@naturalcycles/nodejs-lib/runScript'
import { deployHealthCheck, deployHealthCheckCliOptions } from '../deploy/deployHealthCheck.js'

runScript(async () => {
  const { url, ...opt } = _parseArgs({
    ...deployHealthCheckCliOptions,
    url: {
      type: 'string',
      demandOption: true,
    },
  })

  await deployHealthCheck(url, opt)
})
