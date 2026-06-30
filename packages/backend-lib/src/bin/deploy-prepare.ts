/*

yarn deploy-prepare

 */

import { _parseArgs } from '@naturalcycles/nodejs-lib/args'
import { runScript } from '@naturalcycles/nodejs-lib/runScript'
import { deployPrepare, deployPrepareCliOptions } from '../deploy/deployPrepare.js'

runScript(async () => {
  const opt = _parseArgs(deployPrepareCliOptions)

  await deployPrepare(opt)
})

// deploy strategy
// gae project: from config
// gae service: from config -- branch name
// gae version: automatic form date

// yarn build-prod
// yarn deploy-prepare && ./tmp/deploy/app.yaml && ./tmp/deploy/deployInfo.json && json2env
//
