import {
  createTestItemsDBM,
  runCommonDaoTest,
  runCommonDBTest,
  TEST_TABLE,
} from '@naturalcycles/db-lib/dist/testing/index.js'
import { testOnline } from '@naturalcycles/dev-lib/dist/testing/testOffline.js'
import { pMap } from '@naturalcycles/js-lib'
import { requireEnvKeys } from '@naturalcycles/nodejs-lib'
import { describe, expect, test } from 'vitest'
import { DatastoreDB } from '../datastore.db.js'

testOnline()

import 'dotenv/config'
const { SECRET_GCP_SERVICE_ACCOUNT } = requireEnvKeys('SECRET_GCP_SERVICE_ACCOUNT')
process.env['APP_ENV'] = 'master'

const credentials = JSON.parse(SECRET_GCP_SERVICE_ACCOUNT)

const datastoreDB = new DatastoreDB({
  credentials,
  streamOptions: {
    // experimentalCursorStream: true,
    // debug: true,
  },
})

describe('runCommonDBTest', async () => {
  await runCommonDBTest(datastoreDB)
})

describe('runCommonDaoTest', async () => {
  await runCommonDaoTest(datastoreDB)
})

test('getStats, getStatsCount non-existing table', async () => {
  expect(await datastoreDB.getStats('NonEx')).toBeUndefined()
  expect(await datastoreDB.getStatsCount('NonEx')).toBeUndefined()
})

test('getStatsCount', async () => {
  console.log(await datastoreDB.getStatsCount('Session'))
})

test('getStats', async () => {
  console.log(await datastoreDB.getStats('Session'))
})

test('getAllStats', async () => {
  console.log(await datastoreDB.getAllStats())
})

test('getTables', async () => {
  console.log(await datastoreDB.getTables())
})

test('getTableSchema', async () => {
  // console.log(await datastoreDB.getTableProperties('Account'))
  console.log(await datastoreDB.getTableSchema('Account'))
})

test.skip('GOAWAY stress test', async () => {
  const items = createTestItemsDBM(10_001)

  await pMap(items, async item => {
    await datastoreDB.saveBatch(TEST_TABLE, [item])
  })
})
