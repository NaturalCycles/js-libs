import 'dotenv/config'
import { CommonDao, CommonDaoLogLevel } from '@naturalcycles/db-lib/dao'
import {
  createTestItemsBM,
  runCommonDaoTest,
  runCommonDBTest,
  TEST_TABLE,
  testItemBMSchema,
} from '@naturalcycles/db-lib/testing'
import { requireEnvKeys } from '@naturalcycles/nodejs-lib'
import { afterAll, describe, test } from 'vitest'
import { MongoDB } from '../mongo.db.js'
const { MONGO_URI } = requireEnvKeys('MONGO_URI')

const mongoDB = new MongoDB({
  uri: MONGO_URI,
  db: 'db1',
})

afterAll(async () => {
  await mongoDB.close()
})

describe('runCommonDBTest', async () => {
  await runCommonDBTest(mongoDB)
})

describe('runCommonDaoTest', async () => {
  await runCommonDaoTest(mongoDB)
})

test.skip('some', async () => {
  const dao = new CommonDao({
    table: TEST_TABLE,
    db: mongoDB,
    bmSchema: testItemBMSchema,
    logStarted: true,
    logLevel: CommonDaoLogLevel.DATA_FULL,
  })

  const items = createTestItemsBM(3)
  await dao.saveBatch(items)

  const r = await dao.query().select([]).runQuery()
  console.log(r)
})
