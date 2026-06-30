import { _parseArgs } from '@naturalcycles/nodejs-lib/args'
import { runScript } from '@naturalcycles/nodejs-lib/runScript'
import { undeployGae } from '../deploy/deployGae.js'

runScript(async () => {
  const { branch } = _parseArgs({
    branch: {
      type: 'string',
      demandOption: true,
      desc: `Because Github Actions delete event happens after the branch is already deleted - you need to pass it manually`,
    },
  })

  await undeployGae(branch)
})
