import { requireEnvKeys } from '@naturalcycles/nodejs-lib'
import admin from 'firebase-admin'
import { describe, test } from 'vitest'
import { CloudStorage } from '../cloudStorage.js'
import { runCommonStorageTest } from '../testing/commonStorageTest.js'

const { FIREBASE_SERVICE_ACCOUNT, FIREBASE_BUCKET } = requireEnvKeys(
  'FIREBASE_SERVICE_ACCOUNT',
  'FIREBASE_BUCKET',
)

const credential = admin.credential.cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT))

const app = admin.initializeApp({
  credential,
  // storageBucket: FIREBASE_BUCKET,
})

const storage = CloudStorage.createFromStorage(app.storage() as any)

describe(`runCommonStorageTest`, async () => {
  await runCommonStorageTest(storage, FIREBASE_BUCKET)
})

test('listFiles', async () => {
  const files = await storage.getFileNames(FIREBASE_BUCKET)
  console.log(files)
})
