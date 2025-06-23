import { runCommonKeyValueDBTest } from '@naturalcycles/db-lib/testing'
import { requireEnvKeys } from '@naturalcycles/nodejs-lib'
import { describe } from 'vitest'
import { CloudStorage } from '../cloudStorage.js'
import { CommonStorageKeyValueDB } from '../commonStorageKeyValueDB.js'
import type { GCPServiceAccount } from '../model.js'

const { bucketName, GCP_SERVICE_ACCOUNT: serviceAccountStr } = requireEnvKeys(
  'bucketName',
  'GCP_SERVICE_ACCOUNT',
)
const serviceAccount: GCPServiceAccount = JSON.parse(serviceAccountStr)

const storage = await CloudStorage.createFromGCPServiceAccount(serviceAccount)

const db = new CommonStorageKeyValueDB({
  storage,
  bucketName,
})

describe(`runCommonStorageTest`, async () => {
  await runCommonKeyValueDBTest(db)
})
