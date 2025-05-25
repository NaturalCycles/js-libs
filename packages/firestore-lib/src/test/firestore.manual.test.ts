import { createdUpdatedFields } from '@naturalcycles/db-lib'
import type { TestItemDBM } from '@naturalcycles/db-lib/dist/testing/index.js'
import {
  runCommonDaoTest,
  runCommonDBTest,
  TEST_TABLE,
} from '@naturalcycles/db-lib/dist/testing/index.js'
import { describe, test } from 'vitest'
import { firestoreDB } from './firestore.mock.js'

describe('runCommonDBTest', async () => {
  await runCommonDBTest(firestoreDB)
})

describe('runCommonDaoTest', async () => {
  await runCommonDaoTest(firestoreDB)
})

test.skip('undefined value', async () => {
  const testItem: TestItemDBM = {
    id: '123',
    k1: 'k11',
    k3: undefined,
    // k3: null as any,
    ...createdUpdatedFields(),
  }
  await firestoreDB.saveBatch<TestItemDBM>(TEST_TABLE, [testItem])
  const [loaded] = await firestoreDB.getByIds(TEST_TABLE, [testItem.id])
  console.log(loaded)
})
