import { describe } from 'vitest'
import { InMemoryCommonStorage } from './inMemoryCommonStorage.js'
import { runCommonStorageTest } from './testing/commonStorageTest.js'

const storage = new InMemoryCommonStorage()

describe(`runCommonStorageTest`, async () => {
  await runCommonStorageTest(storage, 'TEST_BUCKET')
})
