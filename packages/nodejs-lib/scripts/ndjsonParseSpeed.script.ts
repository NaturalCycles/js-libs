/*

pn tsx scripts/ndjsonParseSpeed

 */

import { requireEnvKeys } from '../src/index.js'
import { runScript } from '../src/script/runScript.js'
import { Pipeline } from '../src/stream/index.js'

const { SNAPSHOTS_DIR, SNAPSHOT_ID } = requireEnvKeys('SNAPSHOTS_DIR', 'SNAPSHOT_ID')

runScript(async () => {
  const filePath = `${SNAPSHOTS_DIR}/${SNAPSHOT_ID}`
  const outputFilePath = `${SNAPSHOTS_DIR}/${SNAPSHOT_ID}_out.ndjson.gz`
  console.log({ filePath, outputFilePath })
  let keys = 0

  await Pipeline.fromNDJsonFile(filePath)
    .limitSource(10_000)
    .map(async fu => {
      keys += Object.keys(fu || {}).length // just to do some work
      return fu
    })
    .logProgress({ logEvery: 1000, extra: () => ({ keys }) })
    .toNDJsonFile(outputFilePath)
})
