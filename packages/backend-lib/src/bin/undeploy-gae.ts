#!/usr/bin/env node

import { runScript } from '@naturalcycles/nodejs-lib'
import { _yargs } from '@naturalcycles/nodejs-lib/yargs'
import { undeployGae } from '../deploy/deployGae.js'

runScript(async () => {
  const { branch } = _yargs().options({
    branch: {
      type: 'string',
      demandOption: true,
      desc: `Because Github Actions delete event happens after the branch is already deleted - you need to pass it manually`,
    },
  }).argv

  await undeployGae(branch)
})
