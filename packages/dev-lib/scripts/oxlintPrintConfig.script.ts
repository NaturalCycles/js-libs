/*

pn --dir packages/dev-lib exec tsx scripts/oxlintPrintConfig.script.ts

This script allows to track changes in the final oxlint config output,
like a "manual snapshot test".
Changes are visible in git diff every time they are observed.

 */

import { _substringAfter } from '@naturalcycles/js-lib/string'
import { exec2 } from '@naturalcycles/nodejs-lib/exec2'
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'
import { runScript } from '@naturalcycles/nodejs-lib/runScript'
import { testDir } from '../src/paths.js'

runScript(async () => {
  const outputPath = `${testDir}/cfg/oxlint.config.dump.json`

  exec2.spawn(`oxlint --config scripts/oxlintDemo.config.ts --print-config > ${outputPath}`)

  // Normalize absolute paths to be stable across environments
  const json = fs2.readJson<any>(outputPath)
  json.jsPlugins = json.jsPlugins.map((p: string) => _substringAfter(p, '/dev-lib/'))
  fs2.writeJson(outputPath, json, { spaces: 2 })

  exec2.spawn(`oxfmt ${outputPath}`)
})
