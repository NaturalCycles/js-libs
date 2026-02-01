/*

pn --dir packages/dev-lib exec tsx scripts/oxlintPrintConfig.script.ts

This script allows to track changes in the final oxlint config output,
like a "manual snapshot test".
Changes are visible in git diff every time they are observed.

 */

import { exec2 } from '@naturalcycles/nodejs-lib/exec2'
import { runScript } from '@naturalcycles/nodejs-lib/runScript'
import { testDir } from '../src/paths.js'

runScript(async () => {
  const outputPath = `${testDir}/cfg/oxlint.config.dump.json`

  exec2.spawn(`oxlint --config cfg/oxlint.config.json --print-config > ${outputPath}`)

  exec2.spawn(`oxfmt ${outputPath}`)
})
