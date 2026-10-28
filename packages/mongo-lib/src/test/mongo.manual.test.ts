import { runCommonDaoTest, runCommonDBTest } from '@naturalcycles/db-lib/testing'
import { loadEnvFileIfExists, requireEnvKeys } from '@naturalcycles/nodejs-lib'
import { afterAll, describe } from 'vitest'
import { MongoDB } from '../mongo.db.js'

loadEnvFileIfExists()
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
