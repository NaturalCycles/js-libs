import { runCommonDaoTest, runCommonDBTest } from '@naturalcycles/db-lib/testing'
import { testOnline } from '@naturalcycles/dev-lib/testing/testOffline'
import { loadEnvFileIfExists, requireEnvKeys } from '@naturalcycles/nodejs-lib'
import { describe, expect, it } from 'vitest'
import { DatastoreDB } from '../datastore.db.js'

testOnline()

loadEnvFileIfExists()
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

it('should return undefined stats and count for a missing table', async () => {
  expect(await datastoreDB.getStats('NonEx')).toBeUndefined()
  expect(await datastoreDB.getStatsCount('NonEx')).toBeUndefined()
})

it('should get rows from several tables with multiGet without throwing', async () => {
  // const r = await datastoreDB.runQuery(DBQuery.create('Session').limit(5))
  // console.log(r.rows.map(rr => rr.id))

  const accountIds = [
    '0000r9j3f2dlhaon',
    '0001ztxfzgp0gq61',
    '0002jcoojapgoidk',
    '0003fiarp2cf8xpy',
    '0003wr0larnxi0vu',
  ]

  const abcIds = [
    '10000r9j3f2dlhaon',
    '10001ztxfzgp0gq61',
    '10002jcoojapgoidk',
    '10003fiarp2cf8xpy',
    '10003wr0larnxi0vu',
    'non-ex',
  ]

  const r = await datastoreDB.multiGet({
    Account: accountIds,
    Abc: abcIds,
  })
  console.log(r)
})
