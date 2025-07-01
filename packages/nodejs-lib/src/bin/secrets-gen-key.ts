#!/usr/bin/env node

import { randomBytes } from 'node:crypto'
import { dimGrey } from '../colors/colors.js'
import { runScript } from '../script/runScript.js'
import { _yargs } from '../yargs/yargs.util.js'

runScript(() => {
  const { sizeBytes } = _yargs().option('sizeBytes', {
    type: 'number',
    default: 256,
  }).argv

  const key = randomBytes(sizeBytes).toString('base64')

  console.log(dimGrey('\nSECRET_ENCRYPTION_KEY:\n'))
  console.log(key, '\n')
})
