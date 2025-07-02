/*

pn tsx scripts/eslintPrintConfig.script.ts

This script allows to track changes in the final eslint config output,
like a "manual snapshot test".
Changes are visible in git diff every time they are observed.

 */

import { _sortObjectDeep } from '@naturalcycles/js-lib'
import { exec2, runScript } from '@naturalcycles/nodejs-lib'
import { fs2 } from '@naturalcycles/nodejs-lib/fs'
import { testDir } from '../src/paths.js'

runScript(async () => {
  const outputPath = `${testDir}/cfg/eslint.config.dump.json`

  // test file is used, so vitest rules are included
  exec2.spawn(`eslint --print-config src/leak.test.ts > ${outputPath}`)

  // execVoidCommandSync(`eslint --config ./eslint.config.js --parser-options=project:./scripts/tsconfig.json --print-config scripts/eslintPrintConfig.script.ts > ${outputPath}`, [], {
  //   shell: true,
  // })

  const r = fs2.readJson<any>(outputPath)
  delete r.languageOptions.globals
  // r.languageOptions.parser = _substringAfter(r.languageOptions.parser, 'dev-lib/')
  // let str = JSON.stringify(r, null, 2) + '\n'
  // console.log(str)
  // str = str.replaceAll('"error"', '2').replaceAll('"warn"', '1').replaceAll('"off"', '0')
  // fs2.writeFile(outputPath, str)
  fs2.writeJson(outputPath, _sortObjectDeep(r), { spaces: 2 })

  // const output2Path = `${testDir}/cfg/eslint.config.dump2.json`
  // fs2.writeJson(output2Path, require('../cfg/eslint.flat.config'), { spaces: 2 })
})
