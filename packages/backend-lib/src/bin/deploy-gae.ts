import { _parseArgs } from '@naturalcycles/nodejs-lib/args'
import { runScript } from '@naturalcycles/nodejs-lib/runScript'
import { deployGae } from '../deploy/deployGae.js'
import { deployHealthCheckCliOptions } from '../deploy/deployHealthCheck.js'
import { deployPrepareCliOptions } from '../deploy/deployPrepare.js'

runScript(async () => {
  const opt = _parseArgs({
    ...deployPrepareCliOptions,
    ...deployHealthCheckCliOptions,
  })

  await deployGae(opt)
})
