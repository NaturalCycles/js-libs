/*

yarn tsx scripts/streamingTest.script.ts

 */

import { TEST_TABLE } from '@naturalcycles/db-lib/dist/testing/index.js'
import {
  _pipeline,
  runScript,
  transformLogProgress,
  writableForEach,
} from '@naturalcycles/nodejs-lib'
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

  await _pipeline([
    db.streamIds(TEST_TABLE, 5_000_000),
    // db.streamValues(TEST_TABLE, 50_000),
    // db.streamEntries(TEST_TABLE, 50_000),
    transformLogProgress({ logEvery: 10_000 }),
    // writableForEach<KeyValueTuple>(async ([id, v]) => {
    //   // console.log(id, JSON.parse(v.toString()))
    // }),
    // writableForEach<Buffer>(async v => {
    //   // console.log(JSON.parse(v.toString()))
    // }),
    writableForEach<string>(async _id => {
      //
    }),
  ])

  await db.close()
})
