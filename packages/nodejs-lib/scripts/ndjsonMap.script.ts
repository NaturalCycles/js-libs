/*

pn tsx scripts/ndjsonMap.script

 */

import fs from 'node:fs'
import { _range } from '@naturalcycles/js-lib/array/range.js'
import { runScript } from '../src/script/runScript.js'
import { ndjsonMap, Pipeline } from '../src/stream/index.js'
import { tmpDir } from '../src/test/paths.cnst.js'

runScript(async () => {
  const inputFilePath = `${tmpDir}/ndjsonMapIn.ndjson`
  const outputFilePath = `${tmpDir}/ndjsonMapOut.ndjson`

  if (!fs.existsSync(inputFilePath)) {
    // Create input file
    await Pipeline.fromArray(
      _range(1, 101).map(n => ({ id: `id_${n}`, even: n % 2 === 0 })),
    ).toNDJsonFile(inputFilePath)
  }

  await ndjsonMap(mapper, { inputFilePath, outputFilePath })
})

interface Obj {
  id: string
  even?: boolean
}

async function mapper(o: Obj, _index: number): Promise<Obj | undefined> {
  if (o.even) return // filter out evens
  return {
    ...o,
    extra: o.id + '_',
  } as any
}
