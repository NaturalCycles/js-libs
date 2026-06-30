import { randomBytes } from 'node:crypto'
import { _parseArgs } from '../cli/parseArgs.js'
import { dimGrey } from '../colors/colors.js'
import { runScript } from '../script/runScript.js'

runScript(() => {
  const { sizeBytes } = _parseArgs({
    sizeBytes: {
      type: 'number',
      default: 256,
    },
  })

  const key = randomBytes(sizeBytes).toString('base64')

  console.log(dimGrey('\nSECRET_ENCRYPTION_KEY:\n'))
  console.log(key, '\n')
})
