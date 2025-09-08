/*

yarn tsx scripts/streamingTest.script.ts

 */

import { TEST_TABLE } from '@naturalcycles/db-lib/testing'
import { runScript } from '@naturalcycles/nodejs-lib/runScript'
import { Pipeline } from '@naturalcycles/nodejs-lib/stream'
import { SqliteKeyValueDB } from '../src/index.js'
import { tmpDir } from '../src/test/paths.cnst.js'

runScript(async () => {
  const filename = `${tmpDir}/test.sqlite`
  const db = new SqliteKeyValueDB({ filename })
  // "Better" is 6 seconds vs 14 seconds before
  // const db = new BetterSqliteKeyValueDB({ filename })

  await db.open()

  const count = await db.count(TEST_TABLE)
  console.log({ count })

  await Pipeline.from(db.streamIds(TEST_TABLE, 5_000_000))
    // db.streamValues(TEST_TABLE, 50_000),
    // db.streamEntries(TEST_TABLE, 50_000),
    .logProgress({ logEvery: 10_000 })
    // writableForEach<KeyValueTuple>(async ([id, v]) => {
    //   // console.log(id, JSON.parse(v.toString()))
    // }),
    // writableForEach<Buffer>(async v => {
    //   // console.log(JSON.parse(v.toString()))
    // }),
    .forEach(async _id => {
      //
    })

  await db.close()
})
