import { runCommonKeyValueDaoTest, runCommonKeyValueDBTest } from '@naturalcycles/db-lib/testing'
import { testOnline } from '@naturalcycles/dev-lib/testing/testOffline'
import { requireEnvKeys } from '@naturalcycles/nodejs-lib'
import { describe } from 'vitest'
import { DatastoreKeyValueDB } from '../datastoreKeyValueDB.js'

testOnline()

import 'dotenv/config'
const { SECRET_GCP_SERVICE_ACCOUNT } = requireEnvKeys('SECRET_GCP_SERVICE_ACCOUNT')
process.env['APP_ENV'] = 'master'

const credentials = JSON.parse(SECRET_GCP_SERVICE_ACCOUNT)

const db = new DatastoreKeyValueDB({
  credentials,
})

describe('runCommonKeyValueDBTest', async () => {
  await runCommonKeyValueDBTest(db)
})

describe('runCommonKeyValueDaoTest', async () => {
  await runCommonKeyValueDaoTest(db)
})
