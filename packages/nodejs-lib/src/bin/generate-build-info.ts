import fs from 'node:fs'
import path from 'node:path'
import type { UnixTimestamp } from '@naturalcycles/js-lib/types'
import { _parseArgs } from '../cli/parseArgs.js'
import { appendToBashEnv, appendToGithubEnv, appendToGithubOutput } from '../fs/json2env.js'
import { runScript } from '../script/runScript.js'
import { generateBuildInfo } from '../util/buildInfo.util.js'

runScript(async () => {
  const { dir, overrideTimestamp } = _parseArgs({
    dir: {
      type: 'string',
      desc: 'Output directory',
    },
    overrideTimestamp: {
      type: 'number',
      desc: 'This unix timestamp will be used instead of "current time"',
    },
  })

  const buildInfo = generateBuildInfo({
    overrideTimestamp: overrideTimestamp as UnixTimestamp,
  })
  console.log(buildInfo)

  if (dir) fs.mkdirSync(dir, { recursive: true })

  const buildInfoPath = dir ? path.resolve(dir, 'buildInfo.json') : 'buildInfo.json'
  fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2))

  const prefix = 'buildInfo_'

  appendToBashEnv(buildInfo, prefix)
  appendToGithubEnv(buildInfo, prefix)
  appendToGithubOutput(buildInfo, prefix)
})
