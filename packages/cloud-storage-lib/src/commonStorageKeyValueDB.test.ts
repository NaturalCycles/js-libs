import { runCommonKeyValueDBTest } from '@naturalcycles/db-lib/dist/testing/index.js'
import { describe } from 'vitest'
import { CommonStorageKeyValueDB } from './commonStorageKeyValueDB.js'
import { InMemoryCommonStorage } from './inMemoryCommonStorage.js'

const storage = new InMemoryCommonStorage()

const db = new CommonStorageKeyValueDB({
  storage,
  bucketName: 'TEST_BUCKET',
})

describe(`runCommonStorageKeyValueDBTest`, async () => {
  await runCommonKeyValueDBTest(db)
})
