/*

pn tsx scripts/ndjsonParseSpeed

 */

import { requireEnvKeys } from '../src/index.js'
import { runScript } from '../src/script/runScript.js'
import {
  _pipeline,
  createReadStreamAsNDJSON,
  createWriteStreamAsNDJSON,
  transformLogProgress,
  transformMap,
} from '../src/stream/index.js'

const { SNAPSHOTS_DIR, SNAPSHOT_ID } = requireEnvKeys('SNAPSHOTS_DIR', 'SNAPSHOT_ID')

runScript(async () => {
  const filePath = `${SNAPSHOTS_DIR}/${SNAPSHOT_ID}`
  const outputFilePath = `${SNAPSHOTS_DIR}/${SNAPSHOT_ID}_out.ndjson.gz`
  console.log({ filePath, outputFilePath })
  let keys = 0

  await _pipeline([
    createReadStreamAsNDJSON(filePath).take(10_000),
    transformMap<any, any>(async fu => {
      keys += Object.keys(fu || {}).length // just to do some work
      return fu
    }),
    transformLogProgress({ logEvery: 1000, extra: () => ({ keys }) }),
    // writableVoid(),
    ...createWriteStreamAsNDJSON(outputFilePath),
  ])
})
